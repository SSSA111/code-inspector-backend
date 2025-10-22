import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { getDb } from "@/db";
import { apiKeysTable } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/response-helper";
import type {
  HealthCheckRoute,
  GetSupportedLanguagesRoute,
  GetSystemLimitsRoute,
} from "./routes";
import { AppRouteHandler } from "@/types";

// System start time for uptime calculation
const systemStartTime = Date.now();

// Helper function to get API key from Authorization header
async function getApiKeyFromHeader(c: any): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Helper function to validate API key
async function validateApiKey(db: any, apiKey: string): Promise<string | null> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const apiKeyRecord = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyHash, keyHash), eq(apiKeysTable.isActive, true)))
    .get();
    
  return apiKeyRecord?.id || null;
}

// Helper function to check database health
async function checkDatabaseHealth(db: any): Promise<{ status: string; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    // Simple database query to check connectivity
    await db.select().from(apiKeysTable).limit(1);
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 100 ? "healthy" : responseTime < 500 ? "degraded" : "unhealthy",
      responseTime,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
    };
  }
}

// Supported languages configuration
const supportedLanguages = [
  {
    name: "JavaScript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    category: "web" as const,
    analysisSupported: true,
    detectionPatterns: ["function", "var", "const", "let", "=>"],
  },
  {
    name: "TypeScript",
    extensions: [".ts", ".tsx", ".d.ts"],
    category: "web" as const,
    analysisSupported: true,
    detectionPatterns: ["interface", "type", "enum", "namespace"],
  },
  {
    name: "Python",
    extensions: [".py", ".pyw", ".pyc"],
    category: "backend" as const,
    analysisSupported: true,
    detectionPatterns: ["def", "class", "import", "from"],
  },
  {
    name: "Go",
    extensions: [".go"],
    category: "backend" as const,
    analysisSupported: true,
    detectionPatterns: ["package", "func", "import", "type"],
  },
  {
    name: "Rust",
    extensions: [".rs"],
    category: "backend" as const,
    analysisSupported: true,
    detectionPatterns: ["fn", "struct", "impl", "use"],
  },
  {
    name: "SQL",
    extensions: [".sql"],
    category: "database" as const,
    analysisSupported: true,
    detectionPatterns: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  },
  {
    name: "HTML",
    extensions: [".html", ".htm", ".xhtml"],
    category: "web" as const,
    analysisSupported: true,
    detectionPatterns: ["<html", "<body", "<script", "<form"],
  },
  {
    name: "CSS",
    extensions: [".css", ".scss", ".sass", ".less"],
    category: "web" as const,
    analysisSupported: true,
    detectionPatterns: ["{", "}", ":", ";"],
  },
  {
    name: "JSON",
    extensions: [".json", ".jsonc"],
    category: "config" as const,
    analysisSupported: true,
    detectionPatterns: ["{", "}", "[", "]"],
  },
  {
    name: "YAML",
    extensions: [".yaml", ".yml"],
    category: "config" as const,
    analysisSupported: true,
    detectionPatterns: [":", "-", "---"],
  },
  {
    name: "Shell Script",
    extensions: [".sh", ".bash", ".zsh"],
    category: "script" as const,
    analysisSupported: true,
    detectionPatterns: ["#!/bin/", "echo", "if", "for"],
  },
  {
    name: "PowerShell",
    extensions: [".ps1", ".psm1", ".psd1"],
    category: "script" as const,
    analysisSupported: true,
    detectionPatterns: ["Write-Host", "Get-", "Set-", "$"],
  },
];

export const healthCheck: AppRouteHandler<HealthCheckRoute> = async (c) => {
  try {
    const db = getDb(c.env.DB);
    const now = new Date();
    const uptime = Math.floor((Date.now() - systemStartTime) / 1000);

    // Check database health
    const databaseHealth = await checkDatabaseHealth(db);

    // Mock AI service health check
    const aiHealth = {
      status: "healthy" as const,
      responseTime: 45,
    };

    // Mock storage health check  
    const storageHealth = {
      status: "healthy" as const,
      responseTime: 23,
    };

    // Determine overall system health
    const services = {
      database: databaseHealth,
      ai: aiHealth,
      storage: storageHealth,
    };

    const unhealthyServices = Object.values(services).filter(s => s.status === "unhealthy").length;
    const degradedServices = Object.values(services).filter(s => s.status === "degraded").length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (unhealthyServices > 0) {
      overallStatus = "unhealthy";
    } else if (degradedServices > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    const healthData = {
      status: overallStatus,
      timestamp: now,
      uptime,
      services,
      version: "1.0.0",
    };

    const statusCode = overallStatus === "unhealthy" 
      ? HttpStatusCodes.SERVICE_UNAVAILABLE 
      : HttpStatusCodes.OK;

    return successResponse(
      c,
      healthData,
      `System is ${overallStatus}`,
      statusCode
    );
  } catch (error) {
    console.error("Error checking system health:", error);
    return errorResponse(
      c,
      "Error checking system health",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getSupportedLanguages: AppRouteHandler<GetSupportedLanguagesRoute> = async (c) => {
  try {
    const categories = [...new Set(supportedLanguages.map(lang => lang.category))];
    
    const languagesData = {
      languages: supportedLanguages,
      totalLanguages: supportedLanguages.length,
      categories,
      lastUpdated: new Date(), // In real implementation, this would be actual last update time
    };

    return successResponse(
      c,
      languagesData,
      "Supported languages retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting supported languages:", error);
    return errorResponse(
      c,
      "Error getting supported languages",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getSystemLimits: AppRouteHandler<GetSystemLimitsRoute> = async (c) => {
  try {
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const limits = {
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstLimit: 10,
      },
      quotas: {
        maxProjectsPerUser: 50,
        maxFilesPerProject: 1000,
        maxFileSizeMB: 10,
        maxTotalUploadSizeMB: 100,
        maxAnalysisPerDay: 20,
        maxChatMessagesPerProject: 1000,
      },
      features: {
        githubIntegration: true,
        realTimeAnalysis: true,
        bulkOperations: true,
        apiAccess: true,
        exportFormats: ["json", "pdf", "csv"],
      },
      storage: {
        maxStoragePerUserGB: 5,
        retentionDays: 90,
        backupEnabled: true,
      },
    };

    return successResponse(
      c,
      limits,
      "System limits retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting system limits:", error);
    return errorResponse(
      c,
      "Error getting system limits",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};