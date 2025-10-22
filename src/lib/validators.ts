import { z } from "zod";

export const createErrorSchema = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: z.object({
        success: z.literal(false),
        message: z.string(),
      }),
    },
  },
});

export const jsonContentRequired = <T extends z.ZodTypeAny>(schema: T, description?: string) => ({
  content: {
    "application/json": {
      schema,
    },
  },
  required: true,
  description,
});