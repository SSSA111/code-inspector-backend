import { eq, and, or, like } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { getDb } from "@/db";
import { 
  vulnerabilitiesTable,
  apiKeysTable
} from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/response-helper";
import type {
  ListVulnerabilitiesRoute,
  CreateVulnerabilityRoute,
  GetVulnerabilityRoute,
  UpdateVulnerabilityRoute,
  DeleteVulnerabilityRoute,
  SearchVulnerabilitiesRoute,
  SeedVulnerabilitiesRoute,
} from "./routes";
import { AppRouteHandler } from "@/types";

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

// Helper function to generate embeddings for vulnerability content
async function generateVulnerabilityEmbedding(c: any, vulnerability: any): Promise<number[] | null> {
  try {
    // Combine relevant text fields for embedding
    const textToEmbed = `${vulnerability.title} ${vulnerability.description} ${vulnerability.explanation} ${vulnerability.type} ${vulnerability.severity}`;
    
    const embeddings = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: textToEmbed,
    });
    
    return embeddings.data[0] || null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

export const listVulnerabilities: AppRouteHandler<ListVulnerabilitiesRoute> = async (c) => {
  try {
    const query = c.req.valid("query");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const whereConditions = [];
    
    if (query.type) {
      whereConditions.push(eq(vulnerabilitiesTable.type, query.type));
    }
    
    if (query.severity) {
      whereConditions.push(eq(vulnerabilitiesTable.severity, query.severity));
    }
    
    if (query.cweId) {
      whereConditions.push(eq(vulnerabilitiesTable.cweId, query.cweId));
    }
    
    if (query.language) {
      whereConditions.push(like(vulnerabilitiesTable.languages, `%"${query.language}"%`));
    }

    const vulnerabilities = await db
      .select()
      .from(vulnerabilitiesTable)
      .where(whereConditions.length ? and(...whereConditions) : undefined)
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .all();

    // Parse JSON fields for response
    const processedVulnerabilities = vulnerabilities.map(vuln => ({
      ...vuln,
      languages: vuln.languages ? JSON.parse(vuln.languages) : [],
      references: vuln.references ? JSON.parse(vuln.references) : null,
      tags: vuln.tags ? JSON.parse(vuln.tags) : null,
    }));

    return successResponse(
      c,
      processedVulnerabilities,
      "Vulnerabilities retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error listing vulnerabilities:", error);
    return errorResponse(
      c,
      "Error listing vulnerabilities",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const createVulnerability: AppRouteHandler<CreateVulnerabilityRoute> = async (c) => {
  try {
    const data = c.req.valid("json");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const vulnerabilityId = crypto.randomUUID();
    const now = new Date();

    // Generate embedding for the vulnerability
    const embedding = await generateVulnerabilityEmbedding(c, data);
    let vectorId = null;

    if (embedding && c.env.VECTORIZE) {
      try {
        await c.env.VECTORIZE.upsert([
          {
            id: vulnerabilityId,
            values: embedding,
          },
        ]);
        vectorId = vulnerabilityId;
      } catch (error) {
        console.error("Error storing vector:", error);
      }
    }

    const [vulnerability] = await db
      .insert(vulnerabilitiesTable)
      .values({
        id: vulnerabilityId,
        title: data.title,
        description: data.description,
        type: data.type,
        severity: data.severity,
        cweId: data.cweId || null,
        owasp: data.owasp || null,
        languages: JSON.stringify(data.languages),
        codeExample: data.codeExample,
        fixExample: data.fixExample || null,
        explanation: data.explanation,
        references: data.references ? JSON.stringify(data.references) : null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        vectorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Parse JSON fields for response
    const processedVulnerability = {
      ...vulnerability,
      languages: vulnerability.languages ? JSON.parse(vulnerability.languages) : [],
      references: vulnerability.references ? JSON.parse(vulnerability.references) : null,
      tags: vulnerability.tags ? JSON.parse(vulnerability.tags) : null,
    };

    return successResponse(
      c,
      processedVulnerability,
      "Vulnerability created successfully",
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    console.error("Error creating vulnerability:", error);
    return errorResponse(
      c,
      "Error creating vulnerability",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getVulnerability: AppRouteHandler<GetVulnerabilityRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const vulnerability = await db
      .select()
      .from(vulnerabilitiesTable)
      .where(eq(vulnerabilitiesTable.id, id))
      .get();

    if (!vulnerability) {
      return errorResponse(c, "Vulnerability not found", HttpStatusCodes.NOT_FOUND);
    }

    // Parse JSON fields for response
    const processedVulnerability = {
      ...vulnerability,
      languages: vulnerability.languages ? JSON.parse(vulnerability.languages) : [],
      references: vulnerability.references ? JSON.parse(vulnerability.references) : null,
      tags: vulnerability.tags ? JSON.parse(vulnerability.tags) : null,
    };

    return successResponse(
      c,
      processedVulnerability,
      "Vulnerability retrieved successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error getting vulnerability:", error);
    return errorResponse(
      c,
      "Error getting vulnerability",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateVulnerability: AppRouteHandler<UpdateVulnerabilityRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const existingVulnerability = await db
      .select()
      .from(vulnerabilitiesTable)
      .where(eq(vulnerabilitiesTable.id, id))
      .get();

    if (!existingVulnerability) {
      return errorResponse(c, "Vulnerability not found", HttpStatusCodes.NOT_FOUND);
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Convert arrays to JSON strings
    if (data.languages) {
      updateData.languages = JSON.stringify(data.languages);
    }
    if (data.references) {
      updateData.references = JSON.stringify(data.references);
    }
    if (data.tags) {
      updateData.tags = JSON.stringify(data.tags);
    }

    // Update embedding if content changed
    if (data.title || data.description || data.explanation || data.type || data.severity) {
      const mergedData = { ...existingVulnerability, ...data };
      const embedding = await generateVulnerabilityEmbedding(c, mergedData);
      
      if (embedding && c.env.VECTORIZE) {
        try {
          await c.env.VECTORIZE.upsert([
            {
              id: id,
              values: embedding,
            },
          ]);
          updateData.vectorId = id;
        } catch (error) {
          console.error("Error updating vector:", error);
        }
      }
    }

    const [updatedVulnerability] = await db
      .update(vulnerabilitiesTable)
      .set(updateData)
      .where(eq(vulnerabilitiesTable.id, id))
      .returning();

    // Parse JSON fields for response
    const processedVulnerability = {
      ...updatedVulnerability,
      languages: updatedVulnerability.languages ? JSON.parse(updatedVulnerability.languages) : [],
      references: updatedVulnerability.references ? JSON.parse(updatedVulnerability.references) : null,
      tags: updatedVulnerability.tags ? JSON.parse(updatedVulnerability.tags) : null,
    };

    return successResponse(
      c,
      processedVulnerability,
      "Vulnerability updated successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error updating vulnerability:", error);
    return errorResponse(
      c,
      "Error updating vulnerability",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const deleteVulnerability: AppRouteHandler<DeleteVulnerabilityRoute> = async (c) => {
  try {
    const { id } = c.req.valid("param");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    const existingVulnerability = await db
      .select()
      .from(vulnerabilitiesTable)
      .where(eq(vulnerabilitiesTable.id, id))
      .get();

    if (!existingVulnerability) {
      return errorResponse(c, "Vulnerability not found", HttpStatusCodes.NOT_FOUND);
    }

    // Delete from vector database
    if (existingVulnerability.vectorId && c.env.VECTORIZE) {
      try {
        await c.env.VECTORIZE.deleteByIds([existingVulnerability.vectorId]);
      } catch (error) {
        console.error("Error deleting vector:", error);
      }
    }

    await db
      .delete(vulnerabilitiesTable)
      .where(eq(vulnerabilitiesTable.id, id));

    return successResponse(
      c,
      null,
      "Vulnerability deleted successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error deleting vulnerability:", error);
    return errorResponse(
      c,
      "Error deleting vulnerability",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const searchVulnerabilities: AppRouteHandler<SearchVulnerabilitiesRoute> = async (c) => {
  try {
    const { query, limit, language } = c.req.valid("query");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    if (!c.env.VECTORIZE) {
      return errorResponse(c, "Vector search not available", HttpStatusCodes.SERVICE_UNAVAILABLE);
    }

    // Generate embedding for the search query
    const embeddings = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: query,
    });
    
    const vectors = embeddings.data[0];
    if (!vectors) {
      return errorResponse(c, "Failed to generate search embedding", HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // Search in vector database
    const vectorQuery = await c.env.VECTORIZE.query(vectors, { topK: limit || 5 });
    
    if (!vectorQuery.matches || vectorQuery.matches.length === 0) {
      return successResponse(c, [], "No matching vulnerabilities found", HttpStatusCodes.OK);
    }

    // Get vulnerability details from database
    const vulnerabilityIds = vectorQuery.matches.map(match => match.id);
    const whereConditions = [
      eq(vulnerabilitiesTable.id, vulnerabilityIds[0])
    ];
    
    // Add additional IDs if present
    for (let i = 1; i < vulnerabilityIds.length; i++) {
      whereConditions.push(eq(vulnerabilitiesTable.id, vulnerabilityIds[i]));
    }

    let vulnerabilities = await db
      .select()
      .from(vulnerabilitiesTable)
      .where(or(...whereConditions))
      .all();

    // Filter by language if specified
    if (language) {
      vulnerabilities = vulnerabilities.filter(vuln => {
        const languages = vuln.languages ? JSON.parse(vuln.languages) : [];
        return languages.includes(language);
      });
    }

    // Add similarity scores and sort by relevance
    const vulnerabilitiesWithScores = vulnerabilities
      .map(vuln => {
        const match = vectorQuery.matches!.find(m => m.id === vuln.id);
        return {
          ...vuln,
          languages: vuln.languages ? JSON.parse(vuln.languages) : [],
          references: vuln.references ? JSON.parse(vuln.references) : null,
          tags: vuln.tags ? JSON.parse(vuln.tags) : null,
          similarity: match?.score || 0,
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    return successResponse(
      c,
      vulnerabilitiesWithScores,
      "Vulnerabilities search completed successfully",
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error searching vulnerabilities:", error);
    return errorResponse(
      c,
      "Error searching vulnerabilities",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const seedVulnerabilities: AppRouteHandler<SeedVulnerabilitiesRoute> = async (c) => {
  try {
    const { filePath } = c.req.valid("json");
    const db = getDb(c.env.DB);
    
    const apiKey = await getApiKeyFromHeader(c);
    if (!apiKey) {
      return errorResponse(c, "Authorization required", HttpStatusCodes.UNAUTHORIZED);
    }
    
    const apiKeyId = await validateApiKey(db, apiKey);
    if (!apiKeyId) {
      return errorResponse(c, "Invalid API key", HttpStatusCodes.UNAUTHORIZED);
    }

    // Read the JSON file (you'll need to implement file reading based on your environment)
    let vulnerabilityData;
    try {
      // This is a placeholder - implement actual file reading based on your setup
      // For example, if using node fs: const data = await fs.readFile(filePath, 'utf8');
      // vulnerabilityData = JSON.parse(data);
      
      return errorResponse(c, "File reading not implemented yet - please implement based on your environment", HttpStatusCodes.NOT_IMPLEMENTED);
    } catch (error) {
      return errorResponse(c, "Error reading vulnerability file", HttpStatusCodes.BAD_REQUEST);
    }

    // const createdVulnerabilities = [];
    // const failedVulnerabilities = [];

    // for (const vulnData of vulnerabilityData) {
    //   try {
    //     const vulnerabilityId = crypto.randomUUID();
    //     const now = new Date();

    //     // Generate embedding
    //     const embedding = await generateVulnerabilityEmbedding(c, vulnData);
    //     let vectorId = null;

    //     if (embedding && c.env.VECTORIZE) {
    //       try {
    //         await c.env.VECTORIZE.upsert([
    //           {
    //             id: vulnerabilityId,
    //             values: embedding,
    //           },
    //         ]);
    //         vectorId = vulnerabilityId;
    //       } catch (error) {
    //         console.error("Error storing vector for", vulnData.title, error);
    //       }
    //     }

    //     const [vulnerability] = await db
    //       .insert(vulnerabilitiesTable)
    //       .values({
    //         id: vulnerabilityId,
    //         title: vulnData.title,
    //         description: vulnData.description,
    //         type: vulnData.type,
    //         severity: vulnData.severity,
    //         cweId: vulnData.cweId || null,
    //         owasp: vulnData.owasp || null,
    //         languages: JSON.stringify(vulnData.languages || []),
    //         codeExample: vulnData.codeExample,
    //         fixExample: vulnData.fixExample || null,
    //         explanation: vulnData.explanation,
    //         references: vulnData.references ? JSON.stringify(vulnData.references) : null,
    //         tags: vulnData.tags ? JSON.stringify(vulnData.tags) : null,
    //         vectorId,
    //         createdAt: now,
    //         updatedAt: now,
    //       })
    //       .returning();

    //     createdVulnerabilities.push(vulnerability);
    //   } catch (error) {
    //     console.error("Error creating vulnerability:", vulnData.title, error);
    //     failedVulnerabilities.push({
    //       title: vulnData.title,
    //       error: error.message,
    //     });
    //   }
    // }

    // return successResponse(
    //   c,
    //   {
    //     created: createdVulnerabilities.length,
    //     failed: failedVulnerabilities.length,
    //     failedItems: failedVulnerabilities,
    //   },
    //   `Seeding completed: ${createdVulnerabilities.length} created, ${failedVulnerabilities.length} failed`,
    //   HttpStatusCodes.CREATED
    // );
  } catch (error) {
    console.error("Error seeding vulnerabilities:", error);
    return errorResponse(
      c,
      "Error seeding vulnerabilities",
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};