import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createErrorSchema } from "@/lib/validators";
import { SystemValidation } from "./validations";

const tags = ["System"];

export const healthCheck = createRoute({
  path: "/health",
  method: "get",
  tags,
  summary: "Health check",
  description: "Check the health status of the system and its components",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "System is healthy",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: SystemValidation.healthResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: {
      description: "System is unhealthy",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: SystemValidation.healthResponse,
          }),
        },
      },
    },
  },
});

export const getSupportedLanguages = createRoute({
  path: "/supported-languages",
  method: "get",
  tags,
  summary: "Get supported languages",
  description: "Get list of programming languages supported for security analysis",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Supported languages retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: SystemValidation.supportedLanguagesResponse,
          }),
        },
      },
    },
  },
});

export const getSystemLimits = createRoute({
  path: "/limits",
  method: "get",
  tags,
  summary: "Get rate limits and quotas",
  description: "Get current rate limits, quotas, and system constraints",
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      description: "System limits retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: SystemValidation.limitsResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export type HealthCheckRoute = typeof healthCheck;
export type GetSupportedLanguagesRoute = typeof getSupportedLanguages;
export type GetSystemLimitsRoute = typeof getSystemLimits;