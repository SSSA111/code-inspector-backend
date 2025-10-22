import { eq, and, sql, inArray, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { getDb } from "@/db";
import { 
  securityIssuesTable,
  analysisSessionsTable,
  projectsTable,
  apiKeysTable
} from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/response-helper";
import type {
  ListIssuesRoute,
  GetIssueRoute,
  ResolveIssueRoute,
  MarkFalsePositiveRoute,
  BulkUpdateIssuesRoute,
  GetIssueStatsRoute,
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

// Helper function to verify issue ownership through analysis session -> project -> api key
async function verifyIssueOwnership(db: any, issueId: string, apiKeyId: string): Promise<boolean> {
  const issue = await db
    .select()
    .from(securityIssuesTable)
    .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
    .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
    .where(and(
      eq(securityIssuesTable.id, issueId),
      eq(projectsTable.apiKeyId, apiKeyId)
    ))
    .get();
    
  return !!issue;
}

export const listIssues: AppRouteHandler<ListIssuesRoute> = async (c) => {
  try {
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

    // Build where conditions
    const whereConditions = [eq(projectsTable.apiKeyId, apiKeyId)];
    
    if (query.severity) {
      whereConditions.push(eq(securityIssuesTable.severity, query.severity));
    }
    
    if (query.resolved !== undefined) {
      whereConditions.push(eq(securityIssuesTable.resolved, query.resolved));
    }
    
    if (query.falsePositive !== undefined) {
      whereConditions.push(eq(securityIssuesTable.falsePositive, query.falsePositive));
    }
    
    if (query.type) {
      whereConditions.push(eq(securityIssuesTable.type, query.type));
    }
    
    if (query.category) {
      whereConditions.push(eq(securityIssuesTable.category, query.category));
    }
    
    if (query.projectId) {
      whereConditions.push(eq(projectsTable.id, query.projectId));
    }
    
    if (query.analysisSessionId) {
      whereConditions.push(eq(securityIssuesTable.analysisSessionId, query.analysisSessionId));
    }

    // Get issues with project information
    const issues = await db
      .select({
        issue: securityIssuesTable,
        projectName: projectsTable.name,
        projectId: projectsTable.id,
      })
      .from(securityIssuesTable)
      .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(and(...whereConditions))
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .all();

    const enhancedIssues = issues.map(row => ({
      ...row.issue,
      projectName: row.projectName,
      projectId: row.projectId,
    }));

    return successResponse(
      c,
      enhancedIssues,
      "Issues retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error listing issues:", error);
    return errorResponse(
      c,
      "Error listing issues",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getIssue: AppRouteHandler<GetIssueRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const issueOwned = await verifyIssueOwnership(db, id, apiKeyId);
    if (!issueOwned) {
      return errorResponse(c, "Issue not found", HttpStatusCodes.NOT_FOUND);
    }

    // Get issue with additional context
    const issueData = await db
      .select({
        issue: securityIssuesTable,
        projectName: projectsTable.name,
        projectId: projectsTable.id,
        sessionStatus: analysisSessionsTable.status,
      })
      .from(securityIssuesTable)
      .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(eq(securityIssuesTable.id, id))
      .get();

    if (!issueData) {
      return errorResponse(c, "Issue not found", HttpStatusCodes.NOT_FOUND);
    }

    const enhancedIssue = {
      ...issueData.issue,
      projectName: issueData.projectName,
      projectId: issueData.projectId,
      sessionStatus: issueData.sessionStatus,
    };

    return successResponse(
      c,
      enhancedIssue,
      "Issue retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting issue:", error);
    return errorResponse(
      c,
      "Error getting issue",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const resolveIssue: AppRouteHandler<ResolveIssueRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const issueOwned = await verifyIssueOwnership(db, id, apiKeyId);
    if (!issueOwned) {
      return errorResponse(c, "Issue not found", HttpStatusCodes.NOT_FOUND);
    }

    const [updatedIssue] = await db
      .update(securityIssuesTable)
      .set({ resolved: true })
      .where(eq(securityIssuesTable.id, id))
      .returning();

    return successResponse(
      c,
      updatedIssue,
      "Issue marked as resolved",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error resolving issue:", error);
    return errorResponse(
      c,
      "Error resolving issue",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const markFalsePositive: AppRouteHandler<MarkFalsePositiveRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const issueOwned = await verifyIssueOwnership(db, id, apiKeyId);
    if (!issueOwned) {
      return errorResponse(c, "Issue not found", HttpStatusCodes.NOT_FOUND);
    }

    const [updatedIssue] = await db
      .update(securityIssuesTable)
      .set({ falsePositive: true })
      .where(eq(securityIssuesTable.id, id))
      .returning();

    return successResponse(
      c,
      updatedIssue,
      "Issue marked as false positive",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error marking false positive:", error);
    return errorResponse(
      c,
      "Error marking false positive",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const bulkUpdateIssues: AppRouteHandler<BulkUpdateIssuesRoute> = async (c) => {
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

    // Verify all issues belong to the user
    const ownedIssues = await db
      .select({ id: securityIssuesTable.id })
      .from(securityIssuesTable)
      .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(and(
        inArray(securityIssuesTable.id, data.issueIds),
        eq(projectsTable.apiKeyId, apiKeyId)
      ))
      .all();

    const ownedIssueIds = ownedIssues.map(issue => issue.id);
    const unauthorizedIds = data.issueIds.filter(id => !ownedIssueIds.includes(id));

    if (unauthorizedIds.length > 0) {
      return errorResponse(
        c,
        `Some issues not found or unauthorized: ${unauthorizedIds.join(', ')}`,
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Build update object
    const updateData: any = {};
    if (data.resolved !== undefined) updateData.resolved = data.resolved;
    if (data.falsePositive !== undefined) updateData.falsePositive = data.falsePositive;

    if (Object.keys(updateData).length === 0) {
      return errorResponse(c, "No update fields provided", HttpStatusCodes.BAD_REQUEST);
    }

    const updatedIssues = await db
      .update(securityIssuesTable)
      .set(updateData)
      .where(inArray(securityIssuesTable.id, ownedIssueIds))
      .returning();

    return successResponse(
      c,
      {
        updatedCount: updatedIssues.length,
        issues: updatedIssues,
      },
      "Issues updated successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error bulk updating issues:", error);
    return errorResponse(
      c,
      "Error bulk updating issues",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getIssueStats: AppRouteHandler<GetIssueStatsRoute> = async (c) => {
  try {
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    // Get total issues count
    const totalIssues = await db
      .select({ count: sql<number>`count(*)` })
      .from(securityIssuesTable)
      .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(eq(projectsTable.apiKeyId, apiKeyId))
      .get();

    // Get issues by severity
    const issuesBySeverity = await db
      .select({
        severity: securityIssuesTable.severity,
        count: sql<number>`count(*)`
      })
      .from(securityIssuesTable)
      .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(eq(projectsTable.apiKeyId, apiKeyId))
      .groupBy(securityIssuesTable.severity)
      .all();

    // Get issues by status
    const issuesByStatus = await db
      .select({
        resolved: securityIssuesTable.resolved,
        falsePositive: securityIssuesTable.falsePositive,
        count: sql<number>`count(*)`
      })
      .from(securityIssuesTable)
      .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(eq(projectsTable.apiKeyId, apiKeyId))
      .groupBy(securityIssuesTable.resolved, securityIssuesTable.falsePositive)
      .all();

    // Get issues by type (top 10)
    const issuesByType = await db
      .select({
        type: securityIssuesTable.type,
        count: sql<number>`count(*)`
      })
      .from(securityIssuesTable)
      .leftJoin(analysisSessionsTable, eq(securityIssuesTable.analysisSessionId, analysisSessionsTable.id))
      .leftJoin(projectsTable, eq(analysisSessionsTable.projectId, projectsTable.id))
      .where(eq(projectsTable.apiKeyId, apiKeyId))
      .groupBy(securityIssuesTable.type)
      .orderBy(sql`count(*) DESC`)
      .limit(10)
      .all();

    // Calculate status summary
    const statusSummary = {
      open: 0,
      resolved: 0,
      falsePositive: 0,
    };

    issuesByStatus.forEach(row => {
      if (row.falsePositive) {
        statusSummary.falsePositive += row.count;
      } else if (row.resolved) {
        statusSummary.resolved += row.count;
      } else {
        statusSummary.open += row.count;
      }
    });

    const stats = {
      totalIssues: totalIssues?.count || 0,
      severityBreakdown: Object.fromEntries(
        issuesBySeverity.map(row => [row.severity, row.count])
      ),
      statusSummary,
      topIssueTypes: issuesByType,
    };

    return successResponse(
      c,
      stats,
      "Issue statistics retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting issue stats:", error);
    return errorResponse(
      c,
      "Error getting issue stats",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};