import { z } from "zod";
import { 
  selectVulnerabilitiesSchema,
} from "@/db/schema/validation-schema";

export const VulnerabilityValidation = {
  // For creating new vulnerabilities
  createVulnerability: z.object({
    title: z.string().min(5).max(200),
    description: z.string().min(10).max(2000),
    type: z.enum(["xss", "sql_injection", "csrf", "path_traversal", "command_injection", "insecure_deserialization", "xxe", "broken_access_control", "security_misconfiguration", "vulnerable_components"]),
    severity: z.enum(["critical", "high", "medium", "low"]),
    cweId: z.string().regex(/^CWE-\d+$/, "CWE ID must be in format CWE-XXX").optional(),
    owasp: z.string().optional(),
    languages: z.array(z.enum(["javascript", "typescript", "python", "golang", "java", "php", "c", "cpp", "csharp", "ruby"])),
    codeExample: z.string().min(10).max(5000),
    fixExample: z.string().min(10).max(5000).optional(),
    explanation: z.string().min(20).max(3000),
    references: z.array(z.string().url()).optional(),
    tags: z.array(z.string()).optional(),
  }),

  // For updating vulnerabilities
  updateVulnerability: z.object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(10).max(2000).optional(),
    type: z.enum(["xss", "sql_injection", "csrf", "path_traversal", "command_injection", "insecure_deserialization", "xxe", "broken_access_control", "security_misconfiguration", "vulnerable_components"]).optional(),
    severity: z.enum(["critical", "high", "medium", "low"]).optional(),
    cweId: z.string().regex(/^CWE-\d+$/, "CWE ID must be in format CWE-XXX").optional(),
    owasp: z.string().optional(),
    languages: z.array(z.enum(["javascript", "typescript", "python", "golang", "java", "php", "c", "cpp", "csharp", "ruby"])).optional(),
    codeExample: z.string().min(10).max(5000).optional(),
    fixExample: z.string().min(10).max(5000).optional(),
    explanation: z.string().min(20).max(3000).optional(),
    references: z.array(z.string().url()).optional(),
    tags: z.array(z.string()).optional(),
  }),

  // For seeding vulnerabilities from JSON
  seedVulnerabilities: z.object({
    filePath: z.string().min(1),
  }),

  // Vulnerability response
  vulnerabilityResponse: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    type: z.string(),
    severity: z.string(),
    cweId: z.string().nullable(),
    owasp: z.string().nullable(),
    languages: z.array(z.string()),
    codeExample: z.string(),
    fixExample: z.string().nullable(),
    explanation: z.string(),
    references: z.array(z.string()).nullable(),
    tags: z.array(z.string()).nullable(),
    vectorId: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Query parameters for listing vulnerabilities
  listQuery: z.object({
    type: z.enum(["xss", "sql_injection", "csrf", "path_traversal", "command_injection", "insecure_deserialization", "xxe", "broken_access_control", "security_misconfiguration", "vulnerable_components"]).optional(),
    severity: z.enum(["critical", "high", "medium", "low"]).optional(),
    language: z.enum(["javascript", "typescript", "python", "golang", "java", "php", "c", "cpp", "csharp", "ruby"]).optional(),
    cweId: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  }),

  // Search query for RAG
  searchQuery: z.object({
    query: z.string().min(1).max(500),
    limit: z.coerce.number().min(1).max(20).optional().default(5),
    language: z.enum(["javascript", "typescript", "python", "golang", "java", "php", "c", "cpp", "csharp", "ruby"]).optional(),
  }),

  // Param validation for vulnerability ID
  vulnerabilityIdParam: z.object({
    id: z.uuid(),
  }),
};