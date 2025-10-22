import { z } from "zod";
import { 
  selectApiKeysSchema,
} from "@/db/schema/validation-schema";

export const ApiKeyValidation = {
  // For generating new API key
  generateApiKey: z.object({
    name: z.string().min(1).max(100),
  }),

  // Response without sensitive data (for listing)
  apiKeyResponse: z.object({
    id: z.string(),
    name: z.string(),
    usageCount: z.number(),
    isActive: z.boolean(),
    createdAt: z.date(),
  }),

  // Response with the raw key (only returned once on generation)
  apiKeyWithKey: z.object({
    id: z.string(),
    key: z.string(), // Raw API key (only returned once)
    name: z.string(),
    usageCount: z.number(),
    isActive: z.boolean(),
    createdAt: z.date(),
  }),

  // Param validation for API key ID
  apiKeyIdParam: z.object({
    id: z.string().uuid(),
  }),
};