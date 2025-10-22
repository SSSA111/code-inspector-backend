import { z } from "zod";
import { 
  selectAnalysisSessionsSchema,
  selectSecurityIssuesSchema,
} from "@/db/schema/validation-schema";

export const AnalysisValidation = {
  // For starting new analysis
  startAnalysis: z.object({
    projectId: z.string().uuid(),
  }),

  // Analysis session response
  analysisSessionResponse: z.object({
    id: z.string(),
    projectId: z.string(),
    status: z.string(),
    overallScore: z.number().nullable(),
    totalIssues: z.number(),
    criticalIssues: z.number(),
    highIssues: z.number(),
    mediumIssues: z.number(),
    lowIssues: z.number(),
    supportedFiles: z.string().nullable(),
    processingTimeMs: z.number().nullable(),
    aiModelUsed: z.string().nullable(),
    createdAt: z.date(),
    completedAt: z.date().nullable(),
  }),

  // Security issue response
  securityIssueResponse: z.object({
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

  // Combined analysis results (session + issues)
  analysisResultsResponse: z.object({
    id: z.string(),
    projectId: z.string(),
    status: z.string(),
    overallScore: z.number().nullable(),
    totalIssues: z.number(),
    criticalIssues: z.number(),
    highIssues: z.number(),
    mediumIssues: z.number(),
    lowIssues: z.number(),
    supportedFiles: z.string().nullable(),
    processingTimeMs: z.number().nullable(),
    aiModelUsed: z.string().nullable(),
    createdAt: z.date(),
    completedAt: z.date().nullable(),
    securityIssues: z.array(z.object({
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
    })),
  }),

  // Export response
  exportResponse: z.object({
    analysisSession: z.object({
      id: z.string(),
      projectId: z.string(),
      status: z.string(),
      overallScore: z.number().nullable(),
      totalIssues: z.number(),
      criticalIssues: z.number(),
      highIssues: z.number(),
      mediumIssues: z.number(),
      lowIssues: z.number(),
      supportedFiles: z.string().nullable(),
      processingTimeMs: z.number().nullable(),
      aiModelUsed: z.string().nullable(),
      createdAt: z.date(),
      completedAt: z.date().nullable(),
    }),
    projectName: z.string().nullable(),
    securityIssues: z.array(z.object({
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
    })),
    exportedAt: z.date(),
  }),

  // Param validation for session ID
  sessionIdParam: z.object({
    sessionId: z.string().uuid(),
  }),

  // Query validation for export format
  exportQuery: z.object({
    format: z.enum(["json", "pdf"]).optional().default("json"),
  }),
};