import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as  schema from './schema';

export function getDb(d1Instance: D1Database) {
  return drizzle(d1Instance, { schema });
}

export type DB = ReturnType<typeof getDb>;