import { eq, and, desc } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { getDb } from "@/db";
import { 
  chatMessagesTable,
  projectsTable,
  apiKeysTable,
  securityIssuesTable,
  analysisSessionsTable
} from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/response-helper";
import { WorkflowEntrypoint } from "cloudflare:workers";
import type {
  GetMessagesRoute,
  SendMessageRoute,
  ClearMessagesRoute,
} from "./routes";
import { AppRouteHandler, MessageWorkflowEvent, WorkflowStep, AppEnv } from "@/types";

// Helper function to get API key from Authorization header
async function getApiKeyFromHeader(c: any): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Helper function to validate API key and get apiKeyId
async function validateApiKey(db: any, apiKey: string): Promise<string | null> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const apiKeyRecord = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyHash, keyHash), eq(apiKeysTable.isActive, true)))
    .get();
    
  return apiKeyRecord?.id || null;
}

// Helper function to verify project ownership
async function verifyProjectOwnership(db: any, projectId: string, apiKeyId: string): Promise<boolean> {
  const project = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.apiKeyId, apiKeyId)))
    .get();
  
  return !!project;
}

// Message Processing Workflow
export class MessageProcessingWorkflow extends WorkflowEntrypoint<AppEnv> {
  async run(event: MessageWorkflowEvent, step: WorkflowStep) {
    const env = this.env;
    const { messageId, content, projectId } = event.payload;

    // Generate embedding for the message
    const embedding = await step.do("generate message embedding", async () => {
      const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: content,
      });
      const values = embeddings.data[0];
      if (!values) throw new Error("Failed to generate message embedding");
      return values;
    });

    // Store vector for semantic search
    await step.do("store message vector", async () => {
      return env.VECTORIZE.upsert([
        {
          id: `message_${messageId}`,
          values: embedding,
          metadata: { type: "message", projectId }
        },
      ]);
    });

    // Generate AI response if it's a user message
    const aiResponse = await step.do("generate ai response", async () => {
      // Search for relevant context from previous messages and security issues
      const contextVectors = await env.VECTORIZE.query(embedding, { 
        topK: 5,
        filter: { projectId }
      });

      let context: string[] = [];
      
      // Get related messages
      if (contextVectors.matches?.length > 0) {
        const messageIds = contextVectors.matches
          .filter((match: any) => match.metadata?.type === "message")
          .map((match: any) => match.id.replace("message_", ""));
        
        if (messageIds.length > 0) {
          const db = getDb(env.DB);
          const relatedMessages = await db
            .select()
            .from(chatMessagesTable)
            .where(eq(chatMessagesTable.id, messageIds[0]))
            .limit(3);
          
          context.push(...relatedMessages.map(msg => `Previous: ${msg.content}`));
        }
      }

      // Get project security issues for context
      const db = getDb(env.DB);
      const recentIssues = await db
        .select()
        .from(securityIssuesTable)
        .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
        .where(eq(analysisSessionsTable.projectId, projectId))
        .limit(3);

      context.push(...recentIssues.map(issue => 
        `Security Issue: ${issue.security_issues.description}`
      ));

      const contextMessage = context.length 
        ? `Context:\n${context.join("\n")}`
        : "";

      const systemPrompt = `You are a security analysis assistant. Use the provided context about previous messages and security issues to give helpful responses about code security.`;

      const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          ...(context.length ? [{ role: "system", content: contextMessage }] : []),
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ]
      });

      return response.response;
    });

    // Store AI response as new message
    await step.do("store ai response", async () => {
      const db = getDb(env.DB);
      const aiMessageId = crypto.randomUUID();
      
      await db.insert(chatMessagesTable).values({
        id: aiMessageId,
        projectId,
        type: "assistant",
        content: aiResponse,
        createdAt: new Date(),
      });

      // Generate embedding for AI response too
      const aiEmbedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: aiResponse,
      });

      await env.VECTORIZE.upsert([
        {
          id: `message_${aiMessageId}`,
          values: aiEmbedding.data[0],
          metadata: { type: "message", projectId }
        },
      ]);
    });
  }
}

export const getMessages: AppRouteHandler<GetMessagesRoute> = async (c) => {
  try {
    const { id: projectId } = c.req.valid("param");
    const query = c.req.valid("query");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    // Verify project ownership
    const projectOwned = await verifyProjectOwnership(db, projectId, apiKeyId);
    if (!projectOwned) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    // Build where conditions
    const whereConditions = [eq(chatMessagesTable.projectId, projectId)];
    
    if (query.type) {
      whereConditions.push(eq(chatMessagesTable.type, query.type));
    }

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(and(...whereConditions))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .all();

    return successResponse(
      c,
      messages.reverse(), // Reverse to show oldest first
      "Messages retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting messages:", error);
    return errorResponse(
      c,
      "Error getting messages",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const sendMessage: AppRouteHandler<SendMessageRoute> = async (c) => {
  try {
    const { id: projectId } = c.req.valid("param");
    const data = c.req.valid("json");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const projectOwned = await verifyProjectOwnership(db, projectId, apiKeyId);
    if (!projectOwned) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    const messageId = crypto.randomUUID();
    const now = new Date();

    // Store message in database
    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        id: messageId,
        projectId,
        type: data.type,
        content: data.content,
        analysisSessionId: data.analysisSessionId || null,
        metadata: data.metadata || null,
        createdAt: now,
      })
      .returning();

    // Trigger message processing workflow for user messages
    if (data.type === "user") {
      await c.env.MESSAGE_WORKFLOW.create({ 
        params: { 
          messageId, 
          content: data.content, 
          projectId 
        } 
      });
    }

    return successResponse(
      c,
      message,
      "Message sent successfully",
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return errorResponse(
      c,
      "Error sending message",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const clearMessages: AppRouteHandler<ClearMessagesRoute> = async (c) => {
  try {
    const { id: projectId } = c.req.valid("param");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    // Verify project ownership
    const projectOwned = await verifyProjectOwnership(db, projectId, apiKeyId);
    if (!projectOwned) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    // Get count before deletion for response
    const existingMessages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.projectId, projectId))
      .all();

    // Delete all messages for the project
    await db
      .delete(chatMessagesTable)
      .where(eq(chatMessagesTable.projectId, projectId));

    return successResponse(
      c,
      { deletedCount: existingMessages.length },
      "Chat history cleared successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error clearing messages:", error);
    return errorResponse(
      c,
      "Error clearing messages",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};