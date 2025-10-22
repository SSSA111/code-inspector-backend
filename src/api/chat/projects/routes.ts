import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createErrorSchema, jsonContentRequired } from "@/lib/validators";
import { ChatValidation } from "./validations";

const tags = ["Chat"];

export const getMessages = createRoute({
  path: "/{id}/messages",
  method: "get",
  tags,
  summary: "Get chat history",
  description: "Get chat message history for a project",
  security: [{ bearerAuth: [] }],
  request: {
    params: ChatValidation.projectIdParam,
    query: ChatValidation.messagesQuery,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Chat messages retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.array(ChatValidation.messageResponse),
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const sendMessage = createRoute({
  path: "/{id}/messages",
  method: "post",
  tags,
  summary: "Send message",
  description: "Send a new chat message to a project",
  security: [{ bearerAuth: [] }],
  request: {
    params: ChatValidation.projectIdParam,
    body: jsonContentRequired(ChatValidation.sendMessage, "Message data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: "Message sent successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: ChatValidation.messageResponse,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.BAD_REQUEST]: createErrorSchema("Invalid message data"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export const clearMessages = createRoute({
  path: "/{id}/messages",
  method: "delete",
  tags,
  summary: "Clear chat history",
  description: "Delete all chat messages for a project",
  security: [{ bearerAuth: [] }],
  request: {
    params: ChatValidation.projectIdParam,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Chat history cleared successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              deletedCount: z.number(),
            }),
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: createErrorSchema("Project not found"),
    [HttpStatusCodes.UNAUTHORIZED]: createErrorSchema("Authorization required"),
  },
});

export type GetMessagesRoute = typeof getMessages;
export type SendMessageRoute = typeof sendMessage;
export type ClearMessagesRoute = typeof clearMessages;