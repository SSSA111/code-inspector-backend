import { Context } from "hono";
import { Hono } from "hono";
import type { OpenAPIHono, RouteConfig , RouteHandler} from "@hono/zod-openapi";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  role?: string;
}

export type AuthSession = {
  user: AuthUser;
  session: {
    id: string;
    expiresAt: Date;
  };
}

declare module 'hono' {
  interface ContextVariableMap {
    session: AuthSession | null;
  }
}

interface AI {
  run(model: string, options: any): Promise<any>;
}

interface VectorizeIndex {
  query(vector: number[], options?: { topK?: number; filter?: any }): Promise<{
    matches?: Array<{
      id: string;
      score: number;
      values?: number[];
      metadata?: any;
    }>;
    count: number;
  }>;
  upsert(vectors: Array<{
    id: string;
    values: number[];
    metadata?: any;
  }>): Promise<{
    count: number;
    ids: string[];
  }>;
  deleteByIds(ids: string[]): Promise<{
    count: number;
  }>;
}

interface WorkflowInstance {
  create(options: { params: any }): Promise<void>;
}

export type AppEnv = {
  Bindings: {
    DB: D1Database;
    AI: AI;
    VECTORIZE: VectorizeIndex;
    MESSAGE_WORKFLOW: WorkflowInstance;
    ANALYSIS_WORKFLOW: WorkflowInstance;
    CLOUDFLARE_ACCOUNT_ID: string;
    AI_GATEWAY_ID: string;
    GOOGLE_AI_STUDIO_API_KEY: string;
  };
};

export type AppType = Hono<AppEnv>;
export type AppContext = Context<AppEnv>;
export type AppRouter = OpenAPIHono<AppEnv>;
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;
export type AppOpenAPI = OpenAPIHono<AppEnv>;

// Workflow event types
export interface MessageWorkflowEvent {
  payload: {
    messageId: string;
    content: string;
    projectId: string;
  };
}

export interface AnalysisWorkflowEvent {
  payload: {
    sessionId: string;
    projectId: string;
  };
}

export interface WorkflowStep {
  do<T>(name: string, fn: () => Promise<T>): Promise<T>;
}