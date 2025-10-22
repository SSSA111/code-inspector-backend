import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { getDb } from "@/db";
import { apiKeysTable } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/response-helper";
import type {
  GenerateApiKeyRoute,
  ListApiKeysRoute,
  DeleteApiKeyRoute,
} from "./routes";
import { AppRouteHandler } from "@/types";

// Generate a random API key
function generateApiKeyHelper(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "sk-";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hash API key using Web Crypto API
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const generateApiKey: AppRouteHandler<GenerateApiKeyRoute> = async (
  c
) => {
  try {
    const data = c.req.valid("json");
    const db = getDb(c.env.DB);

    const apiKey = generateApiKeyHelper();
    const keyHash = await hashApiKey(apiKey);
    const id = crypto.randomUUID();

    const [newApiKey] = await db
      .insert(apiKeysTable)
      .values({
        id,
        keyHash,
        name: data.name,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    // Return the raw key (user won't see it again) along with metadata
    return successResponse(
      c,
      {
        id: newApiKey.id,
        key: apiKey, // Only returned once
        name: newApiKey.name,
        createdAt: newApiKey.createdAt,
        isActive: newApiKey.isActive,
        usageCount: newApiKey.usageCount,
      },
      "API key generated successfully",
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    console.error("Error generating API key:", error);
    return errorResponse(
      c,
      "Error generating API key",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const listApiKeys: AppRouteHandler<ListApiKeysRoute> = async (c) => {
  try {
    const db = getDb(c.env.DB);

    const apiKeys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        usageCount: apiKeysTable.usageCount,
        isActive: apiKeysTable.isActive,
        createdAt: apiKeysTable.createdAt,
        // Exclude keyHash for security
      })
      .from(apiKeysTable)
      .all();

    return successResponse(
      c,
      apiKeys,
      "API keys retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error listing API keys:", error);
    return errorResponse(
      c,
      "Error listing API keys",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const deleteApiKey: AppRouteHandler<DeleteApiKeyRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);

    const existingKey = await db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, id))
      .get();

    if (!existingKey) {
      return errorResponse(c, "API key not found", HttpStatusCodes.NOT_FOUND);
    }

    await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id));

    return successResponse(
      c,
      null,
      "API key deleted successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error deleting API key:", error);
    return errorResponse(
      c,
      "Error deleting API key",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
