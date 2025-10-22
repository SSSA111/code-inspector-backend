import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createErrorSchema, jsonContentRequired } from "@/lib/validators";
import { VulnerabilityValidation } from "./validations";

const tags = ["Vulnerabilities"];

export const listVulnerabilities = createRoute({
  path: "/",
  method: "get",
  tags,
  summary: "List vulnerabilities",
  description: "Get list of vulnerabilities with optional filtering",
  security: [{ bearerAuth: [] }],
  request: {
    query: VulnerabilityValidation.listQuery,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Vulnerabilities retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(VulnerabilityValidation.vulnerabilityResponse),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const createVulnerability = createRoute({
  path: "/",
  method: "post",
  tags,
  summary: "Create vulnerability",
  description: "Create a new vulnerability entry and generate embeddings for RAG",
  security: [{ bearerAuth: [] }],
  request: {
    body: jsonContentRequired(VulnerabilityValidation.createVulnerability, "Vulnerability data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: "Vulnerability created successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: VulnerabilityValidation.vulnerabilityResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid vulnerability data"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const getVulnerability = createRoute({
  path: "/{id}",
  method: "get",
  tags,
  summary: "Get vulnerability",
  description: "Get a specific vulnerability by ID",
  security: [{ bearerAuth: [] }],
  request: {
    params: VulnerabilityValidation.vulnerabilityIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Vulnerability retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: VulnerabilityValidation.vulnerabilityResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Vulnerability not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const updateVulnerability = createRoute({
  path: "/{id}",
  method: "put",
  tags,
  summary: "Update vulnerability",
  description: "Update an existing vulnerability and regenerate embeddings",
  security: [{ bearerAuth: [] }],
  request: {
    params: VulnerabilityValidation.vulnerabilityIdParam,
    body: jsonContentRequired(VulnerabilityValidation.updateVulnerability, "Vulnerability update data"),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Vulnerability updated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: VulnerabilityValidation.vulnerabilityResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Vulnerability not found"),
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid update data"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const deleteVulnerability = createRoute({
  path: "/{id}",
  method: "delete",
  tags,
  summary: "Delete vulnerability",
  description: "Delete a vulnerability and its associated embeddings",
  security: [{ bearerAuth: [] }],
  request: {
    params: VulnerabilityValidation.vulnerabilityIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Vulnerability deleted successfully",
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
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Vulnerability not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const searchVulnerabilities = createRoute({
  path: "/search",
  method: "get",
  tags,
  summary: "Search vulnerabilities",
  description: "Search vulnerabilities using vector similarity (RAG)",
  security: [{ bearerAuth: [] }],
  request: {
    query: VulnerabilityValidation.searchQuery,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Vulnerabilities search completed successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(VulnerabilityValidation.vulnerabilityResponse.extend({
              similarity: z.number(),
            })),
          }),
        },
      },
    },
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: createErrorSchema("Vector search not available"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const seedVulnerabilities = createRoute({
  path: "/seed",
  method: "post",
  tags,
  summary: "Seed vulnerabilities",
  description: "Seed vulnerabilities from JSON file and generate embeddings for RAG",
  security: [{ bearerAuth: [] }],
  request: {
    body: jsonContentRequired(VulnerabilityValidation.seedVulnerabilities, "Seed data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: "Vulnerabilities seeded successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              created: z.number(),
              failed: z.number(),
              failedItems: z.array(z.object({
                title: z.string(),
                error: z.string(),
              })),
            }),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid seed data or file"),
    [HttpStatusCodes.NOT_IMPLEMENTED]: createErrorSchema("File reading not implemented"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export type ListVulnerabilitiesRoute = typeof listVulnerabilities;
export type CreateVulnerabilityRoute = typeof createVulnerability;
export type GetVulnerabilityRoute = typeof getVulnerability;
export type UpdateVulnerabilityRoute = typeof updateVulnerability;
export type DeleteVulnerabilityRoute = typeof deleteVulnerability;
export type SearchVulnerabilitiesRoute = typeof searchVulnerabilities;
export type SeedVulnerabilitiesRoute = typeof seedVulnerabilities;