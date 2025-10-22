import { z } from "zod";

export const SystemValidation = {
  // Health check response
  healthResponse: z.object({
    status: z.enum(["healthy", "degraded", "unhealthy"]),
    timestamp: z.date(),
    uptime: z.number(), // seconds
    services: z.object({
      database: z.object({
        status: z.enum(["healthy", "degraded", "unhealthy"]),
        responseTime: z.number(), // milliseconds
      }),
      ai: z.object({
        status: z.enum(["healthy", "degraded", "unhealthy"]),
        responseTime: z.number().optional(),
      }),
      storage: z.object({
        status: z.enum(["healthy", "degraded", "unhealthy"]),
        responseTime: z.number().optional(),
      }),
    }),
    version: z.string(),
  }),

  // Supported languages response
  supportedLanguagesResponse: z.object({
    languages: z.array(z.object({
      name: z.string(),
      extensions: z.array(z.string()),
      category: z.enum(["web", "backend", "mobile", "database", "config", "script"]),
      analysisSupported: z.boolean(),
      detectionPatterns: z.array(z.string()).optional(),
    })),
    totalLanguages: z.number(),
    categories: z.array(z.string()),
    lastUpdated: z.date(),
  }),

  // System limits response
  limitsResponse: z.object({
    rateLimits: z.object({
      requestsPerMinute: z.number(),
      requestsPerHour: z.number(),
      requestsPerDay: z.number(),
      burstLimit: z.number(),
    }),
    quotas: z.object({
      maxProjectsPerUser: z.number(),
      maxFilesPerProject: z.number(),
      maxFileSizeMB: z.number(),
      maxTotalUploadSizeMB: z.number(),
      maxAnalysisPerDay: z.number(),
      maxChatMessagesPerProject: z.number(),
    }),
    features: z.object({
      githubIntegration: z.boolean(),
      realTimeAnalysis: z.boolean(),
      bulkOperations: z.boolean(),
      apiAccess: z.boolean(),
      exportFormats: z.array(z.string()),
    }),
    storage: z.object({
      maxStoragePerUserGB: z.number(),
      retentionDays: z.number(),
      backupEnabled: z.boolean(),
    }),
  }),
};