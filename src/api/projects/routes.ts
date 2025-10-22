import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createErrorSchema, jsonContentRequired } from "@/lib/validators";
import { ProjectValidation } from "./validations";

const tags = ["Projects"];

export const listProjects = createRoute({
  path: "/",
  method: "get",
  tags,
  summary: "List user's projects",
  description: "Get all projects for the authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Projects retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(ProjectValidation.projectResponse),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const createProject = createRoute({
  path: "/",
  method: "post",
  tags,
  summary: "Create new project",
  description: "Create a new project for the authenticated user",
  security: [{ bearerAuth: [] }],
  request: {
    body: jsonContentRequired(ProjectValidation.createProject, "Project data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: "Project created successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: ProjectValidation.projectResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid input data"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const getProject = createRoute({
  path: "/{id}",
  method: "get",
  tags,
  summary: "Get project details",
  description: "Get details of a specific project",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectValidation.projectIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Project retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: ProjectValidation.projectResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const updateProject = createRoute({
  path: "/{id}",
  method: "put",
  tags,
  summary: "Update project",
  description: "Update an existing project",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectValidation.projectIdParam,
    body: jsonContentRequired(ProjectValidation.updateProject, "Project update data"),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Project updated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: ProjectValidation.projectResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid input data"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const deleteProject = createRoute({
  path: "/{id}",
  method: "delete",
  tags,
  summary: "Delete project",
  description: "Delete a project and all associated data",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectValidation.projectIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Project deleted successfully",
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
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const getProjectHistory = createRoute({
  path: "/{id}/history",
  method: "get",
  tags,
  summary: "Get analysis history",
  description: "Get analysis history for a project",
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectValidation.projectIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Project analysis history retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(ProjectValidation.analysisSessionResponse),
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export type ListProjectsRoute = typeof listProjects;
export type CreateProjectRoute = typeof createProject;
export type GetProjectRoute = typeof getProject;
export type UpdateProjectRoute = typeof updateProject;
export type DeleteProjectRoute = typeof deleteProject;
export type GetProjectHistoryRoute = typeof getProjectHistory;