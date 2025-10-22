import { z } from "zod";
import {
  selectProjectsSchema,
  insertProjectsSchema,
  updateProjectsSchema,
  selectAnalysisSessionsSchema,
} from "@/db/schema/validation-schema";

export const ProjectValidation = {
  // For creating new projects (exclude id, apiKeyId, timestamps)
  createProject: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(["folder", "github"]),
    sourceUrl: z
      .string()
      .min(1)
      .max(500)
      .refine((url) => {
        // For github type, should be a valid URL
        // For folder type, can be a path
        try {
          new URL(url);
          return true;
        } catch {
          // If not a valid URL, check if it's a valid path (starts with / or contains path separators)
          return url.startsWith("/") || url.includes("\\") || url.includes("/");
        }
      }, "sourceUrl must be a valid URL for GitHub projects or a valid path for folder projects"),
    content: z.string().min(1).max(604800),
    languageStats: z.string().optional(),
    status: z.enum(["active", "archived", "deleted"]).optional(),
  }),

  // For updating projects (all fields optional except what user can change)
  updateProject: z.object({
    name: z.string().min(1).max(255).optional(),
    type: z.enum(["folder", "github"]).optional(),
    sourceUrl: z
      .string()
      .min(1)
      .max(500)
      .refine((url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return url.startsWith("/") || url.includes("\\") || url.includes("/");
        }
      }, "sourceUrl must be a valid URL for GitHub projects or a valid path for folder projects")
      .optional(),
    content: z.string().min(1).max(204800).optional(),
    languageStats: z.string().optional(),
    status: z.enum(["active", "archived", "deleted"]).optional(),
    lastAnalyzedAt: z.date().optional(),
  }),

  // Response schema (exclude apiKeyId for security)
  projectResponse: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    sourceUrl: z.string(),
    content: z.string(),
    languageStats: z.string().nullable(),
    status: z.string(),
    lastAnalyzedAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Analysis session response for history endpoint
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

  // Param validation for project ID
  projectIdParam: z.object({
    id: z.uuid(),
  }),
};
