import { z } from "zod";

export const ChatValidation = {
  // Send message request body
  sendMessage: z.object({
    content: z.string().min(1).max(10000),
    type: z.enum(["user", "assistant"]).default("user"),
    analysisSessionId: z.uuid().optional(),
    metadata: z.string().optional(), // JSON string
  }),

  // Chat message response
  messageResponse: z.object({
    id: z.string(),
    projectId: z.string(),
    type: z.string(),
    content: z.string(),
    analysisSessionId: z.string().nullable(),
    metadata: z.string().nullable(),
    createdAt: z.date(),
  }),

  // Project ID parameter
  projectIdParam: z.object({
    id: z.uuid(),
  }),

  // Query parameters for pagination
  messagesQuery: z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
    type: z.enum(["user", "assistant"]).optional(),
  }),
};