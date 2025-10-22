import { eq, and } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "@/db";
import { 
  analysisSessionsTable,
  securityIssuesTable,
  projectsTable,
  apiKeysTable
} from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/response-helper";
import type {
  StartAnalysisRoute,
  GetAnalysisResultsRoute,
  ExportAnalysisRoute,
} from "./routes";
import { AppRouteHandler } from "@/types";
import { z } from "zod";

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

// Vulnerability detection schema for AI response validation
const VulnerabilityDetectionSchema = z.object({
  vulnerabilities: z.array(z.object({
    severity: z.enum(["critical", "high", "medium", "low"]),
    type: z.string().min(1),
    category: z.string().min(1),
    filePath: z.string().min(1),
    lineNumber: z.number().optional(),
    codeSnippet: z.string().optional(),
    description: z.string().min(10),
    recommendation: z.string().min(10),
    confidenceScore: z.number().min(0).max(1).optional()
  }))
});

async function analyzeCode(
  content: string, 
  projectName: string,
  accountId: string,
  gatewayId: string,
  apiKey: string
): Promise<any[]> {
  const systemPrompt = `You are a security analyst examining code for vulnerabilities. Analyze the provided code and identify security issues.

IMPORTANT: Respond with valid JSON only, no additional text. Use this exact structure:
{
  "vulnerabilities": [
    {
      "severity": "critical|high|medium|low",
      "type": "SQL Injection|XSS|Path Traversal|Command Injection|etc",
      "category": "Input Validation|Authentication|Authorization|etc",
      "filePath": "path/to/file.js",
      "lineNumber": 42,
      "codeSnippet": "vulnerable code snippet - escape all quotes and backslashes",
      "description": "Clear description of the vulnerability",
      "recommendation": "How to fix this issue",
      "confidenceScore": 0.95
    }
  ]
}

CRITICAL: In codeSnippet and all string fields:
- Escape backslashes as \\\\
- Escape double quotes as \\"
- Replace newlines with \\n
- Keep code snippets under 200 characters

Focus on these vulnerability types:
- SQL Injection
- Cross-Site Scripting (XSS)
- Path Traversal
- Command Injection
- Insecure Deserialization
- Broken Authentication
- Broken Access Control
- Security Misconfiguration
- Insecure Direct Object References
- CSRF

If no vulnerabilities found, return: {"vulnerabilities": []}`;

  const userPrompt = `${systemPrompt}

Project: ${projectName}

\`\`\`
${content}
\`\`\``;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use the lite version for faster, cheaper processing
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash-lite" },
      {
        baseUrl: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/google-ai-studio`,
      },
    );

    const result = await model.generateContent([userPrompt]);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      console.error('No content in AI response');
      return [];
    }

    // Extract JSON more carefully - try multiple approaches
    let jsonText = '';
    
    // Try extracting from code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    } else {
      // Fallback to regex match
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }
    
    if (!jsonText) {
      console.error('No JSON found in AI response:', text);
      return [];
    }

    try {
      const parsedResponse = JSON.parse(jsonText);
      const validatedResponse = VulnerabilityDetectionSchema.parse(parsedResponse);
      console.log('Validated AI response:', validatedResponse);
      
      return validatedResponse.vulnerabilities.map(vuln => ({
        ...vuln,
        filePath: vuln.filePath || `${projectName}/main.js`
      }));
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      console.error('Problematic JSON:', jsonText);
      
      // Fallback: return empty array
      return [];
    }

  } catch (error) {
    console.error('Error analyzing code:', error);
    return [];
  }
}

export const startAnalysis: AppRouteHandler<StartAnalysisRoute> = async (c) => {
  try {
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

    // Verify project ownership
    const projectOwned = await verifyProjectOwnership(db, data.projectId, apiKeyId);
    if (!projectOwned) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    // Get project details
    const project = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, data.projectId))
      .get();

    if (!project) {
      return errorResponse(c, "Project not found", HttpStatusCodes.NOT_FOUND);
    }

    const sessionId = crypto.randomUUID();
    const now = new Date();
    const startTime = Date.now();

    // Perform analysis synchronously
    const vulnerabilities = await analyzeCode(
      project.content,
      project.name,
      c.env.CLOUDFLARE_ACCOUNT_ID,
      c.env.AI_GATEWAY_ID,
      c.env.GOOGLE_AI_STUDIO_API_KEY
    );

    // Calculate issue counts by severity
    const issueCounts = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length
    };

    // Calculate overall security score (0-10, higher is better)
    const totalIssues = vulnerabilities.length;
    let overallScore = 10;
    
    if (totalIssues > 0) {
      overallScore = Math.max(0, 10 - (
        issueCounts.critical * 3 +
        issueCounts.high * 2 +
        issueCounts.medium * 1 +
        issueCounts.low * 0.5
      ));
    }

    const processingTime = Date.now() - startTime;

    // Create analysis session first
    const [analysisSession] = await db
      .insert(analysisSessionsTable)
      .values({
        id: sessionId,
        projectId: data.projectId,
        status: "completed",
        overallScore,
        totalIssues,
        criticalIssues: issueCounts.critical,
        highIssues: issueCounts.high,
        mediumIssues: issueCounts.medium,
        lowIssues: issueCounts.low,
        processingTimeMs: processingTime,
        aiModelUsed: "gemini-2.5-flash-lite",
        createdAt: now,
        completedAt: new Date(),
      })
      .returning();

    // Then store vulnerabilities that reference the session
    const storedIssues = [];
    for (const vuln of vulnerabilities) {
      try {
        const issueId = crypto.randomUUID();
        const [issue] = await db
          .insert(securityIssuesTable)
          .values({
            id: issueId,
            analysisSessionId: sessionId,
            severity: vuln.severity,
            type: vuln.type,
            category: vuln.category,
            filePath: vuln.filePath,
            lineNumber: vuln.lineNumber,
            codeSnippet: vuln.codeSnippet,
            description: vuln.description,
            recommendation: vuln.recommendation,
            confidenceScore: vuln.confidenceScore || 0.8,
            falsePositive: false,
            resolved: false,
            createdAt: new Date(),
          })
          .returning();
        
        storedIssues.push(issue);
      } catch (error) {
        console.error('Error storing vulnerability:', error);
      }
    }

    // Update project last analyzed time
    await db
      .update(projectsTable)
      .set({
        lastAnalyzedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(projectsTable.id, project.id));

    // Return complete results
    const result = {
      ...analysisSession,
      securityIssues: storedIssues,
    };

    return successResponse(
      c,
      result,
      "Analysis completed successfully",
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    console.error("Error performing analysis:", error);
    return errorResponse(
      c,
      "Error performing analysis",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAnalysisResults: AppRouteHandler<GetAnalysisResultsRoute> = async (c) => {
  try {
    const { sessionId } = c.req.valid("param");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    // Get analysis session and verify ownership through project
    const analysisSession = await db
      .select({
        session: analysisSessionsTable,
        projectApiKeyId: projectsTable.apiKeyId,
      })
      .from(analysisSessionsTable)
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(eq(analysisSessionsTable.id, sessionId))
      .get();

    if (!analysisSession || analysisSession.projectApiKeyId !== apiKeyId) {
      return errorResponse(c, "Analysis session not found", HttpStatusCodes.NOT_FOUND);
    }

    // Get security issues for this session
    const securityIssues = await db
      .select()
      .from(securityIssuesTable)
      .where(eq(securityIssuesTable.analysisSessionId, sessionId))
      .all();

    const result = {
      ...analysisSession.session,
      securityIssues,
    };

    return successResponse(
      c,
      result,
      "Analysis results retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting analysis results:", error);
    return errorResponse(
      c,
      "Error getting analysis results",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const exportAnalysis: AppRouteHandler<ExportAnalysisRoute> = async (c) => {
  try {
    const { sessionId } = c.req.valid("param");
    const { format } = c.req.valid("query");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    // Get analysis session and verify ownership
    const analysisSession = await db
      .select({
        session: analysisSessionsTable,
        projectApiKeyId: projectsTable.apiKeyId,
        projectName: projectsTable.name,
      })
      .from(analysisSessionsTable)
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(eq(analysisSessionsTable.id, sessionId))
      .get();

    if (!analysisSession || analysisSession.projectApiKeyId !== apiKeyId) {
      return errorResponse(c, "Analysis session not found", HttpStatusCodes.NOT_FOUND);
    }

    // Get security issues
    const securityIssues = await db
      .select()
      .from(securityIssuesTable)
      .where(eq(securityIssuesTable.analysisSessionId, sessionId))
      .all();

    const exportData = {
      analysisSession: analysisSession.session,
      projectName: analysisSession.projectName,
      securityIssues,
      exportedAt: new Date(),
    };

    if (format === "pdf") {
      // For PDF export, you would typically generate a PDF here
      // For now, return JSON with PDF headers
      c.header("Content-Type", "application/pdf");
      c.header("Content-Disposition", `attachment; filename="analysis_${sessionId}.pdf"`);
      
      return successResponse(
        c,
        { message: "PDF export would be generated here", data: exportData },
        "PDF export prepared (mock implementation)",
        HttpStatusCodes.OK
      );
    }

    // JSON export
    c.header("Content-Type", "application/json");
    c.header("Content-Disposition", `attachment; filename="analysis_${sessionId}.json"`);
    
    return successResponse(
      c,
      exportData,
      "Analysis exported successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error exporting analysis:", error);
    return errorResponse(
      c,
      "Error exporting analysis",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};