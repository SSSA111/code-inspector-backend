import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

import {
  apiKeysTable,
  projectsTable,
  analysisSessionsTable,
  securityIssuesTable,
  chatMessagesTable,
  projectTypeValues,
  projectStatusValues,
  analysisStatusValues,
  severityValues,
  messageTypeValues,
  vulnerabilitiesTable,
  vulnerabilityTypeValues,
  vulnerabilityLanguageValues,
} from "./index";

// ==============================================
// API KEYS SCHEMAS
// ==============================================

export const selectApiKeysSchema = createSelectSchema(apiKeysTable);
export const insertApiKeysSchema = createInsertSchema(apiKeysTable, {
  id: (schema) => z.uuid("Invalid UUID format"),
  keyHash: (schema) => schema.min(64).max(64), // SHA-256 hash is always 64 chars
  name: (schema) => schema.min(1).max(100),
  usageCount: (schema) => schema.int().nonnegative(),
});
export const updateApiKeysSchema = createUpdateSchema(apiKeysTable, {
  keyHash: (schema) => schema.min(64).max(64),
  name: (schema) => schema.min(1).max(100),
  usageCount: (schema) => schema.int().nonnegative(),
});

// ==============================================
// PROJECTS SCHEMAS
// ==============================================

export const selectProjectsSchema = createSelectSchema(projectsTable);
export const insertProjectsSchema = createInsertSchema(projectsTable, {
  id: (schema) => z.uuid("Invalid UUID format"),
  apiKeyId: (schema) => z.uuid("Invalid API Key ID format"),
  name: (schema) => schema.min(1).max(255),
  type: (schema) =>
    schema.refine(
      (val) => (projectTypeValues as unknown as string[]).includes(val),
      {
        message: `Type must be one of: ${projectTypeValues.join(", ")}`,
      }
    ),
  sourceUrl: (schema) => schema.min(1).max(500),
  content: (schema) =>
    schema
      .min(1, "Content is required")
      .max(204800, "Content must not exceed 200KB"), // 200KB = 204800 characters
  status: (schema) =>
    schema.refine(
      (val) => (projectStatusValues as unknown as string[]).includes(val),
      {
        message: `Status must be one of: ${projectStatusValues.join(", ")}`,
      }
    ),
  languageStats: (schema) =>
    schema
      .refine((val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      }, "Language stats must be valid JSON")
      .optional(),
});
export const updateProjectsSchema = createUpdateSchema(projectsTable, {
  name: (schema) => schema.min(1).max(255),
  type: (schema) =>
    schema.refine(
      (val) => (projectTypeValues as unknown as string[]).includes(val),
      {
        message: `Type must be one of: ${projectTypeValues.join(", ")}`,
      }
    ),
  sourceUrl: (schema) => schema.min(1).max(500),
  content: (schema) =>
    schema
      .min(1, "Content is required")
      .max(204800, "Content must not exceed 200KB")
      .optional(),
  status: (schema) =>
    schema.refine(
      (val) => (projectStatusValues as unknown as string[]).includes(val),
      {
        message: `Status must be one of: ${projectStatusValues.join(", ")}`,
      }
    ),
  languageStats: (schema) =>
    schema
      .refine((val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      }, "Language stats must be valid JSON")
      .optional(),
});

// ==============================================
// ANALYSIS SESSIONS SCHEMAS
// ==============================================

export const selectAnalysisSessionsSchema = createSelectSchema(
  analysisSessionsTable
);
export const insertAnalysisSessionsSchema = createInsertSchema(
  analysisSessionsTable,
  {
    id: (schema) => z.uuid("Invalid UUID format"),
    projectId: (schema) => z.uuid("Invalid Project ID format"),
    status: (schema) =>
      schema.refine(
        (val) => (analysisStatusValues as unknown as string[]).includes(val),
        {
          message: `Status must be one of: ${analysisStatusValues.join(", ")}`,
        }
      ),
    overallScore: (schema) => schema.min(0).max(10).optional(),
    totalIssues: (schema) => schema.int().nonnegative(),
    criticalIssues: (schema) => schema.int().nonnegative(),
    highIssues: (schema) => schema.int().nonnegative(),
    mediumIssues: (schema) => schema.int().nonnegative(),
    lowIssues: (schema) => schema.int().nonnegative(),
    processingTimeMs: (schema) => schema.int().nonnegative().optional(),
    supportedFiles: (schema) =>
      schema
        .refine((val) => {
          if (!val) return true;
          try {
            JSON.parse(val);
            return true;
          } catch {
            return false;
          }
        }, "Supported files must be valid JSON")
        .optional(),
    aiModelUsed: (schema) => schema.min(1).max(100).optional(),
  }
);
export const updateAnalysisSessionsSchema = createUpdateSchema(
  analysisSessionsTable,
  {
    status: (schema) =>
      schema.refine(
        (val) => (analysisStatusValues as unknown as string[]).includes(val),
        {
          message: `Status must be one of: ${analysisStatusValues.join(", ")}`,
        }
      ),
    overallScore: (schema) => schema.min(0).max(10).optional(),
    totalIssues: (schema) => schema.int().nonnegative(),
    criticalIssues: (schema) => schema.int().nonnegative(),
    highIssues: (schema) => schema.int().nonnegative(),
    mediumIssues: (schema) => schema.int().nonnegative(),
    lowIssues: (schema) => schema.int().nonnegative(),
    processingTimeMs: (schema) => schema.int().nonnegative().optional(),
    supportedFiles: (schema) =>
      schema
        .refine((val) => {
          if (!val) return true;
          try {
            JSON.parse(val);
            return true;
          } catch {
            return false;
          }
        }, "Supported files must be valid JSON")
        .optional(),
    aiModelUsed: (schema) => schema.min(1).max(100).optional(),
  }
);

// ==============================================
// SECURITY ISSUES SCHEMAS
// ==============================================

export const selectSecurityIssuesSchema =
  createSelectSchema(securityIssuesTable);
export const insertSecurityIssuesSchema = createInsertSchema(
  securityIssuesTable,
  {
    id: (schema) => z.uuid("Invalid UUID format"),
    analysisSessionId: (schema) => z.uuid("Invalid Analysis Session ID format"),
    severity: (schema) =>
      schema.refine(
        (val) => (severityValues as unknown as string[]).includes(val),
        {
          message: `Severity must be one of: ${severityValues.join(", ")}`,
        }
      ),
    type: (schema) => schema.min(1).max(100),
    category: (schema) => schema.min(1).max(100),
    filePath: (schema) => schema.min(1).max(500),
    lineNumber: (schema) => schema.int().positive().optional(),
    description: (schema) => schema.min(10).max(2000),
    recommendation: (schema) => schema.min(10).max(2000),
    confidenceScore: (schema) => schema.min(0).max(1).optional(),
    codeSnippet: (schema) => schema.max(5000).optional(),
  }
);
export const updateSecurityIssuesSchema = createUpdateSchema(
  securityIssuesTable,
  {
    severity: (schema) =>
      schema.refine(
        (val) => (severityValues as unknown as string[]).includes(val),
        {
          message: `Severity must be one of: ${severityValues.join(", ")}`,
        }
      ),
    type: (schema) => schema.min(1).max(100),
    category: (schema) => schema.min(1).max(100),
    filePath: (schema) => schema.min(1).max(500),
    lineNumber: (schema) => schema.int().positive().optional(),
    description: (schema) => schema.min(10).max(2000),
    recommendation: (schema) => schema.min(10).max(2000),
    confidenceScore: (schema) => schema.min(0).max(1).optional(),
    codeSnippet: (schema) => schema.max(5000).optional(),
  }
);

// ==============================================
// CHAT MESSAGES SCHEMAS
// ==============================================

export const selectChatMessagesSchema = createSelectSchema(chatMessagesTable);
export const insertChatMessagesSchema = createInsertSchema(chatMessagesTable, {
  id: (schema) => z.uuid("Invalid UUID format"),
  projectId: (schema) => z.uuid("Invalid Project ID format"),
  type: (schema) =>
    schema.refine(
      (val) => (messageTypeValues as unknown as string[]).includes(val),
      {
        message: `Type must be one of: ${messageTypeValues.join(", ")}`,
      }
    ),
  content: (schema) => schema.min(1).max(10000),
  analysisSessionId: (schema) =>
    schema.uuid("Invalid Analysis Session ID format").optional(),
  metadata: (schema) =>
    schema
      .refine((val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      }, "Metadata must be valid JSON")
      .optional(),
});
export const updateChatMessagesSchema = createUpdateSchema(chatMessagesTable, {
  type: (schema) =>
    schema.refine(
      (val) => (messageTypeValues as unknown as string[]).includes(val),
      {
        message: `Type must be one of: ${messageTypeValues.join(", ")}`,
      }
    ),
  content: (schema) => schema.min(1).max(10000),
  analysisSessionId: (schema) =>
    z.uuid("Invalid Analysis Session ID format").optional(),
  metadata: (schema) =>
    schema
      .refine((val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      }, "Metadata must be valid JSON")
      .optional(),
});

// ==============================================
// VULNERABILITIES SCHEMAS
// ==============================================

export const selectVulnerabilitiesSchema =
  createSelectSchema(vulnerabilitiesTable);
export const insertVulnerabilitiesSchema = createInsertSchema(
  vulnerabilitiesTable,
  {
    id: (schema) => z.uuid("Invalid UUID format"),
    title: (schema) => schema.min(5).max(200),
    description: (schema) => schema.min(10).max(2000),
    type: (schema) =>
      schema.refine(
        (val) => (vulnerabilityTypeValues as unknown as string[]).includes(val),
        {
          message: `Type must be one of: ${vulnerabilityTypeValues.join(", ")}`,
        }
      ),
    severity: (schema) =>
      schema.refine(
        (val) => (severityValues as unknown as string[]).includes(val),
        {
          message: `Severity must be one of: ${severityValues.join(", ")}`,
        }
      ),
    cweId: (schema) =>
      schema.regex(/^CWE-\d+$/, "CWE ID must be in format CWE-XXX").optional(),
    languages: (schema) =>
      schema.refine((val) => {
        try {
          const parsed = JSON.parse(val);
          return (
            Array.isArray(parsed) &&
            parsed.every((lang) =>
              vulnerabilityLanguageValues.includes(lang as any)
            )
          );
        } catch {
          return false;
        }
      }, "Languages must be a valid JSON array of supported languages"),
    codeExample: (schema) => schema.min(10).max(5000),
    fixExample: (schema) => schema.min(10).max(5000).optional(),
    explanation: (schema) => schema.min(20).max(3000),
    references: (schema) =>
      schema
        .refine((val) => {
          if (!val) return true;
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed);
          } catch {
            return false;
          }
        }, "References must be a valid JSON array")
        .optional(),
    tags: (schema) =>
      schema
        .refine((val) => {
          if (!val) return true;
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed);
          } catch {
            return false;
          }
        }, "Tags must be a valid JSON array")
        .optional(),
  }
);

export const updateVulnerabilitiesSchema = createUpdateSchema(
  vulnerabilitiesTable,
  {
    title: (schema) => schema.min(5).max(200),
    description: (schema) => schema.min(10).max(2000),
    type: (schema) =>
      schema.refine(
        (val) => (vulnerabilityTypeValues as unknown as string[]).includes(val),
        {
          message: `Type must be one of: ${vulnerabilityTypeValues.join(", ")}`,
        }
      ),
    severity: (schema) =>
      schema.refine(
        (val) => (severityValues as unknown as string[]).includes(val),
        {
          message: `Severity must be one of: ${severityValues.join(", ")}`,
        }
      ),
    cweId: (schema) =>
      schema.regex(/^CWE-\d+$/, "CWE ID must be in format CWE-XXX").optional(),
    languages: (schema) =>
      schema.refine((val) => {
        try {
          const parsed = JSON.parse(val);
          return (
            Array.isArray(parsed) &&
            parsed.every((lang) =>
              vulnerabilityLanguageValues.includes(lang as any)
            )
          );
        } catch {
          return false;
        }
      }, "Languages must be a valid JSON array of supported languages"),
    codeExample: (schema) => schema.min(10).max(5000),
    fixExample: (schema) => schema.min(10).max(5000).optional(),
    explanation: (schema) => schema.min(20).max(3000),
    references: (schema) =>
      schema
        .refine((val) => {
          if (!val) return true;
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed);
          } catch {
            return false;
          }
        }, "References must be a valid JSON array")
        .optional(),
    tags: (schema) =>
      schema
        .refine((val) => {
          if (!val) return true;
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed);
          } catch {
            return false;
          }
        }, "Tags must be a valid JSON array")
        .optional(),
  }
);

// ==============================================
// TYPE EXPORTS
// ==============================================

// API Keys Types
export type InsertApiKeysSchema = z.infer<typeof insertApiKeysSchema>;
export type UpdateApiKeysSchema = z.infer<typeof updateApiKeysSchema>;
export type SelectApiKeysSchema = z.infer<typeof selectApiKeysSchema>;

// Projects Types
export type InsertProjectsSchema = z.infer<typeof insertProjectsSchema>;
export type UpdateProjectsSchema = z.infer<typeof updateProjectsSchema>;
export type SelectProjectsSchema = z.infer<typeof selectProjectsSchema>;

// Analysis Sessions Types
export type InsertAnalysisSessionsSchema = z.infer<
  typeof insertAnalysisSessionsSchema
>;
export type UpdateAnalysisSessionsSchema = z.infer<
  typeof updateAnalysisSessionsSchema
>;
export type SelectAnalysisSessionsSchema = z.infer<
  typeof selectAnalysisSessionsSchema
>;

// Security Issues Types
export type InsertSecurityIssuesSchema = z.infer<
  typeof insertSecurityIssuesSchema
>;
export type UpdateSecurityIssuesSchema = z.infer<
  typeof updateSecurityIssuesSchema
>;
export type SelectSecurityIssuesSchema = z.infer<
  typeof selectSecurityIssuesSchema
>;

// Chat Messages Types
export type InsertChatMessagesSchema = z.infer<typeof insertChatMessagesSchema>;
export type UpdateChatMessagesSchema = z.infer<typeof updateChatMessagesSchema>;
export type SelectChatMessagesSchema = z.infer<typeof selectChatMessagesSchema>;

// Vulnerabilities Types
export type InsertVulnerabilitiesSchema = z.infer<
  typeof insertVulnerabilitiesSchema
>;
export type UpdateVulnerabilitiesSchema = z.infer<
  typeof updateVulnerabilitiesSchema
>;
export type SelectVulnerabilitiesSchema = z.infer<
  typeof selectVulnerabilitiesSchema
>;
