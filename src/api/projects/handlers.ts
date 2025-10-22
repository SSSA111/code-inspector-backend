import { eq, and } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { getDb } from "@/db";
import {
  projectsTable,
  analysisSessionsTable,
  apiKeysTable,
  chatMessagesTable,
  securityIssuesTable,
} from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/response-helper";
import type {
  ListProjectsRoute,
  CreateProjectRoute,
  GetProjectRoute,
  UpdateProjectRoute,
  DeleteProjectRoute,
  GetProjectHistoryRoute,
} from "./routes";
import { AppRouteHandler } from "@/types";

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
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const apiKeyRecord = await db
    .select()
    .from(apiKeysTable)
    .where(
      and(eq(apiKeysTable.keyHash, keyHash), eq(apiKeysTable.isActive, true))
    )
    .get();

  return apiKeyRecord?.id || null;
}

export const listProjects: AppRouteHandler<ListProjectsRoute> = async (c) => {
  try {
    const db = getDb(c.env.DB);

    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(
        c,
        "Authorization required",
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.apiKeyId, apiKeyId))
      .all();

    return successResponse(
      c,
      projects,
      "Projects retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error listing projects:", error);
    return errorResponse(
      c,
      "Error listing projects",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const createProject: AppRouteHandler<CreateProjectRoute> = async (c) => {
  try {
    const data = c.req.valid("json");
    const db = getDb(c.env.DB);

    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(
        c,
        "Authorization required",
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const projectId = crypto.randomUUID();
    const now = new Date();

    const [project] = await db
      .insert(projectsTable)
      .values({
        id: projectId,
        apiKeyId,
        name: data.name,
        type: data.type,
        sourceUrl: data.sourceUrl,
        content: data.content,
        languageStats: data.languageStats,
        status: data.status || "active",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return successResponse(
      c,
      project,
      "Project created successfully",
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return errorResponse(
      c,
      "Error creating project",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getProject: AppRouteHandler<GetProjectRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);

    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(
        c,
        "Authorization required",
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const project = await db
      .select()
      .from(projectsTable)
      .where(
        and(eq(projectsTable.id, id), eq(projectsTable.apiKeyId, apiKeyId))
      )
      .get();

    if (!project) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    return successResponse(
      c,
      project,
      "Project retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting project:", error);
    return errorResponse(
      c,
      "Error getting project",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateProject: AppRouteHandler<UpdateProjectRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const db = getDb(c.env.DB);

    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(
        c,
        "Authorization required",
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const existingProject = await db
      .select()
      .from(projectsTable)
      .where(
        and(eq(projectsTable.id, id), eq(projectsTable.apiKeyId, apiKeyId))
      )
      .get();

    if (!existingProject) {
      console.error("Project not found for update:", id);
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    const [updatedProject] = await db
      .update(projectsTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, id))
      .returning();

    return successResponse(
      c,
      updatedProject,
      "Project updated successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error updating project:", error);
    return errorResponse(
      c,
      "Error updating project",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const deleteProject: AppRouteHandler<DeleteProjectRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);

    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(
        c,
        "Authorization required",
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const existingProject = await db
      .select()
      .from(projectsTable)
      .where(
        and(eq(projectsTable.id, id), eq(projectsTable.apiKeyId, apiKeyId))
      )
      .get();

    if (!existingProject) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    // Delete related records in correct order to respect foreign key constraints
    
    // 1. Delete chat messages
    await db
      .delete(chatMessagesTable)
      .where(eq(chatMessagesTable.projectId, id));

    // 2. Get all analysis sessions for this project
    const analysisSessions = await db
      .select()
      .from(analysisSessionsTable)
      .where(eq(analysisSessionsTable.projectId, id))
      .all();

    // 3. Delete security issues for each analysis session
    for (const session of analysisSessions) {
      await db
        .delete(securityIssuesTable)
        .where(eq(securityIssuesTable.analysisSessionId, session.id));
    }

    // 4. Delete analysis sessions
    await db
      .delete(analysisSessionsTable)
      .where(eq(analysisSessionsTable.projectId, id));

    // 5. Finally delete the project
    await db.delete(projectsTable).where(eq(projectsTable.id, id));

    return successResponse(
      c,
      null,
      "Project deleted successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error deleting project:", error);
    return errorResponse(
      c,
      "Error deleting project",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getProjectHistory: AppRouteHandler<
  GetProjectHistoryRoute
> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);

    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(
        c,
        "Authorization required",
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    // Verify project exists and belongs to user
    const project = await db
      .select()
      .from(projectsTable)
      .where(
        and(eq(projectsTable.id, id), eq(projectsTable.apiKeyId, apiKeyId))
      )
      .get();

    if (!project) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    // Get analysis history for the project
    const analysisHistory = await db
      .select()
      .from(analysisSessionsTable)
      .where(eq(analysisSessionsTable.projectId, id))
      .all();

    return successResponse(
      c,
      analysisHistory,
      "Project analysis history retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting project history:", error);
    return errorResponse(
      c,
      "Error getting project history",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
