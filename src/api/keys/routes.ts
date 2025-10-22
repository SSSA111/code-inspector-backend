import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createErrorSchema, jsonContentRequired } from "@/lib/validators";
import { ApiKeyValidation } from "./validations";

const tags = ["API Keys"];

export const generateApiKey = createRoute({
  path: "/generate",
  method: "post",
  tags,
  summary: "Generate new API key",
  description: "Generate a new API key for authentication",
  request: {
    body: jsonContentRequired(ApiKeyValidation.generateApiKey, "API key generation data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: "API key generated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: ApiKeyValidation.apiKeyWithKey,
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid input data"),
  },
});

export const listApiKeys = createRoute({
  path: "/",
  method: "get",
  tags,
  summary: "List API keys",
  description: "Get all API keys (without sensitive data)",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "API keys retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(ApiKeyValidation.apiKeyResponse),
          }),
        },
      },
    },
  },
});

export const deleteApiKey = createRoute({
  path: "/{id}",
  method: "delete",
  tags,
  summary: "Delete API key",
  description: "Delete an API key by ID",
  request: {
    params: ApiKeyValidation.apiKeyIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "API key deleted successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.null(),
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("API key not found"),
  },
});

export type GenerateApiKeyRoute = typeof generateApiKey;
export type ListApiKeysRoute = typeof listApiKeys;
export type DeleteApiKeyRoute = typeof deleteApiKey;