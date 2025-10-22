import { z } from "zod";
import { 
  selectSecurityIssuesSchema,
} from "@/db/schema/validation-schema";

export const IssueValidation = {
  // Query parameters for listing issues
  listQuery: z.object({
    severity: z.enum(["critical", "high", "medium", "low"]).optional(),
    resolved: z.coerce.boolean().optional(),
    falsePositive: z.coerce.boolean().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    projectId: z.uuid().optional(),
    analysisSessionId: z.uuid().optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    offset: z.coerce.number().min(0).optional(),
  }),

  // Basic issue response
  issueResponse: z.object({
    id: z.string(),
    analysisSessionId: z.string(),
    severity: z.string(),
    type: z.string(),
    category: z.string(),
    filePath: z.string(),
    lineNumber: z.number().nullable(),
    codeSnippet: z.string().nullable(),
    description: z.string(),
    recommendation: z.string(),
    confidenceScore: z.number().nullable(),
    falsePositive: z.boolean(),
    resolved: z.boolean(),
    createdAt: z.date(),
  }),

  // Issue response with additional context
  issueResponseWithContext: z.object({
    id: z.string(),
    analysisSessionId: z.string(),
    severity: z.string(),
    type: z.string(),
    category: z.string(),
    filePath: z.string(),
    lineNumber: z.number().nullable(),
    codeSnippet: z.string().nullable(),
    description: z.string(),
    recommendation: z.string(),
    confidenceScore: z.number().nullable(),
    falsePositive: z.boolean(),
    resolved: z.boolean(),
    createdAt: z.date(),
    projectName: z.string().nullable(),
    projectId: z.string().nullable(),
    sessionStatus: z.string().optional(),
  }),

  // Bulk update request body
  bulkUpdate: z.object({
    issueIds: z.array(z.uuid()).min(1).max(100),
    resolved: z.boolean().optional(),
    falsePositive: z.boolean().optional(),
  }).refine(
    (data) => data.resolved !== undefined || data.falsePositive !== undefined,
    {
      message: "At least one update field (resolved or falsePositive) must be provided",
    }
  ),

  // Issue statistics response
  issueStats: z.object({
    totalIssues: z.number(),
    severityBreakdown: z.record(z.string(), z.number()),
    statusSummary: z.object({
      open: z.number(),
      resolved: z.number(),
      falsePositive: z.number(),
    }),
    topIssueTypes: z.array(z.object({
      type: z.string(),
      count: z.number(),
    })),
  }),

  // Param validation for issue ID
  issueIdParam: z.object({
    id: z.uuid(),
  }),
};