import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createErrorSchema, jsonContentRequired } from "@/lib/validators";
import { AnalysisValidation } from "./validations";

const tags = ["Analysis"];

export const startAnalysis = createRoute({
  path: "/analyze",
  method: "post",
  tags,
  summary: "Start new analysis",
  description: "Start a new security analysis for a project and return complete results",
  security: [{ bearerAuth: [] }],
  request: {
    body: jsonContentRequired(AnalysisValidation.startAnalysis, "Analysis request data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: "Analysis completed successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: AnalysisValidation.analysisResultsResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid input data"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const getAnalysisResults = createRoute({
  path: "/{sessionId}",
  method: "get",
  tags,
  summary: "Get analysis results",
  description: "Get the results of a completed security analysis session",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnalysisValidation.sessionIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Analysis results retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: AnalysisValidation.analysisResultsResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Analysis session not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const exportAnalysis = createRoute({
  path: "/{sessionId}/export",
  method: "get",
  tags,
  summary: "Export results",
  description: "Export analysis results in PDF or JSON format",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnalysisValidation.sessionIdParam,
    query: AnalysisValidation.exportQuery,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Analysis exported successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: AnalysisValidation.exportResponse,
          }),
        },
        "application/pdf": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              message: z.string(),
              data: z.any(),
            }),
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Analysis session not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export type StartAnalysisRoute = typeof startAnalysis;
export type GetAnalysisResultsRoute = typeof getAnalysisResults;
export type ExportAnalysisRoute = typeof exportAnalysis;