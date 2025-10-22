import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createErrorSchema, jsonContentRequired } from "@/lib/validators";
import { IssueValidation } from "./validations";

const tags = ["Issues"];

export const listIssues = createRoute({
  path: "/",
  method: "get",
  tags,
  summary: "List issues with filters",
  description: "Get security issues with optional filtering and pagination",
  security: [{ bearerAuth: [] }],
  request: {
    query: IssueValidation.listQuery,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Issues retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(IssueValidation.issueResponseWithContext),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const getIssue = createRoute({
  path: "/{id}",
  method: "get",
  tags,
  summary: "Get specific issue",
  description: "Get details of a specific security issue",
  security: [{ bearerAuth: [] }],
  request: {
    params: IssueValidation.issueIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Issue retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: IssueValidation.issueResponseWithContext,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Issue not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const resolveIssue = createRoute({
  path: "/{id}/resolve",
  method: "put",
  tags,
  summary: "Mark issue as resolved",
  description: "Mark a security issue as resolved",
  security: [{ bearerAuth: [] }],
  request: {
    params: IssueValidation.issueIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Issue marked as resolved",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: IssueValidation.issueResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Issue not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const markFalsePositive = createRoute({
  path: "/{id}/false-positive",
  method: "put",
  tags,
  summary: "Mark as false positive",
  description: "Mark a security issue as false positive",
  security: [{ bearerAuth: [] }],
  request: {
    params: IssueValidation.issueIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Issue marked as false positive",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: IssueValidation.issueResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Issue not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const bulkUpdateIssues = createRoute({
  path: "/bulk-update",
  method: "post",
  tags,
  summary: "Bulk update multiple issues",
  description: "Update multiple security issues at once",
  security: [{ bearerAuth: [] }],
  request: {
    body: jsonContentRequired(IssueValidation.bulkUpdate, "Bulk update data"),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Issues updated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              updatedCount: z.number(),
              issues: z.array(IssueValidation.issueResponse),
            }),
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Some issues not found"),
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid input data"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const getIssueStats = createRoute({
  path: "/stats",
  method: "get",
  tags,
  summary: "Get issue statistics",
  description: "Get aggregated statistics about security issues",
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Issue statistics retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: IssueValidation.issueStats,
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export type ListIssuesRoute = typeof listIssues;
export type GetIssueRoute = typeof getIssue;
export type ResolveIssueRoute = typeof resolveIssue;
export type MarkFalsePositiveRoute = typeof markFalsePositive;
export type BulkUpdateIssuesRoute = typeof bulkUpdateIssues;
export type GetIssueStatsRoute = typeof getIssueStats;