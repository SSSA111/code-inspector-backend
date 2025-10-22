import { relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// Enum values
export const projectTypeValues = ["folder", "github"] as const;
export const projectStatusValues = ["active", "archived", "deleted"] as const;
export const analysisStatusValues = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export const severityValues = ["critical", "high", "medium", "low"] as const;
export const messageTypeValues = ["user", "assistant"] as const;
export const vulnerabilityTypeValues = [
  "xss",
  "sql_injection",
  "csrf",
  "path_traversal",
  "command_injection",
  "insecure_deserialization",
  "xxe",
  "broken_access_control",
  "security_misconfiguration",
  "vulnerable_components",
] as const;
export const vulnerabilityLanguageValues = [
  "javascript",
  "typescript",
  "python",
  "golang",
  "java",
  "php",
  "c",
  "cpp",
  "csharp",
  "ruby",
] as const;

export type projectTypeType = (typeof projectTypeValues)[number];
export type projectStatusType = (typeof projectStatusValues)[number];
export type analysisStatusType = (typeof analysisStatusValues)[number];
export type severityType = (typeof severityValues)[number];
export type messageTypeType = (typeof messageTypeValues)[number];
export type vulnerabilityTypeType = (typeof vulnerabilityTypeValues)[number];
export type vulnerabilityLanguageType =
  (typeof vulnerabilityLanguageValues)[number];

// API Keys table
export const apiKeysTable = sqliteTable("api_keys", {
  id: text("id").primaryKey(), // UUID as text
  keyHash: text("key_hash").notNull().unique(), // SHA-256 hash of the actual API key
  name: text("name").notNull(), // User-friendly name for the key
  usageCount: integer("usage_count").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Vulnerabilities table
export const vulnerabilitiesTable = sqliteTable("vulnerabilities", {
  id: text("id").primaryKey(), // UUID as text
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").$type<vulnerabilityTypeType>().notNull(),
  severity: text("severity").$type<severityType>().notNull(),
  cweId: text("cwe_id"), // CWE identifier like "CWE-79"
  owasp: text("owasp"), // OWASP Top 10 category
  languages: text("languages").notNull(), // JSON array of supported languages
  codeExample: text("code_example").notNull(), // Vulnerable code example
  fixExample: text("fix_example"), // Fixed code example
  explanation: text("explanation").notNull(), // Detailed explanation
  references: text("references"), // JSON array of reference URLs
  tags: text("tags"), // JSON array of tags for categorization
  vectorId: text("vector_id"), // Reference to vector database entry
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Projects table
export const projectsTable = sqliteTable("projects", {
  id: text("id").primaryKey(), // UUID as text
  apiKeyId: text("api_key_id")
    .notNull()
    .references(() => apiKeysTable.id),
  name: text("name").notNull(),
  type: text("type").$type<projectTypeType>().notNull(),
  sourceUrl: text("source_url").notNull(), // GitHub URL or local path identifier
  content: text("content").notNull(),
  languageStats: text("language_stats"), // JSON: detected languages and file counts
  status: text("status").$type<projectStatusType>().notNull().default("active"),
  lastAnalyzedAt: integer("last_analyzed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Analysis Sessions table
export const analysisSessionsTable = sqliteTable("analysis_sessions", {
  id: text("id").primaryKey(), // UUID as text
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id),
  status: text("status")
    .$type<analysisStatusType>()
    .notNull()
    .default("pending"),
  overallScore: real("overall_score"), // decimal 0-10
  totalIssues: integer("total_issues").notNull().default(0),
  criticalIssues: integer("critical_issues").notNull().default(0),
  highIssues: integer("high_issues").notNull().default(0),
  mediumIssues: integer("medium_issues").notNull().default(0),
  lowIssues: integer("low_issues").notNull().default(0),
  supportedFiles: text("supported_files"), // JSON
  processingTimeMs: integer("processing_time_ms"),
  aiModelUsed: text("ai_model_used"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// Security Issues table
export const securityIssuesTable = sqliteTable("security_issues", {
  id: text("id").primaryKey(), // UUID as text
  analysisSessionId: text("analysis_session_id")
    .notNull()
    .references(() => analysisSessionsTable.id),
  severity: text("severity").$type<severityType>().notNull(),
  type: text("type").notNull(), // "SQL Injection", "XSS", etc.
  category: text("category").notNull(), // "Authentication", "Input Validation", etc.
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number"),
  codeSnippet: text("code_snippet"),
  description: text("description").notNull(),
  recommendation: text("recommendation").notNull(),
  confidenceScore: real("confidence_score"), // decimal 0-1
  falsePositive: integer("false_positive", { mode: "boolean" })
    .notNull()
    .default(false),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Chat Messages table
export const chatMessagesTable = sqliteTable("chat_messages", {
  id: text("id").primaryKey(), // UUID as text
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id),
  type: text("type").$type<messageTypeType>().notNull(),
  content: text("content").notNull(),
  analysisSessionId: text("analysis_session_id").references(
    () => analysisSessionsTable.id
  ), // nullable
  metadata: text("metadata"), // JSON: additional data like file references, etc.
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// RELATIONS
// ====================================

export const apiKeysRelations = relations(apiKeysTable, ({ many }) => ({
  projects: many(projectsTable),
}));

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  apiKey: one(apiKeysTable, {
    fields: [projectsTable.apiKeyId],
    references: [apiKeysTable.id],
  }),
  analysisSessions: many(analysisSessionsTable),
  chatMessages: many(chatMessagesTable),
}));

export const analysisSessionsRelations = relations(
  analysisSessionsTable,
  ({ one, many }) => ({
    project: one(projectsTable, {
      fields: [analysisSessionsTable.projectId],
      references: [projectsTable.id],
    }),
    securityIssues: many(securityIssuesTable),
    chatMessages: many(chatMessagesTable),
  })
);

export const securityIssuesRelations = relations(
  securityIssuesTable,
  ({ one }) => ({
    analysisSession: one(analysisSessionsTable, {
      fields: [securityIssuesTable.analysisSessionId],
      references: [analysisSessionsTable.id],
    }),
  })
);

export const chatMessagesRelations = relations(
  chatMessagesTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [chatMessagesTable.projectId],
      references: [projectsTable.id],
    }),
    analysisSession: one(analysisSessionsTable, {
      fields: [chatMessagesTable.analysisSessionId],
      references: [analysisSessionsTable.id],
    }),
  })
);
