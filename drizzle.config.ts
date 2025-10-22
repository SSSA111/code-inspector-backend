import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'; // To load .dev.vars for drizzle-kit

if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  throw new Error('CLOUDFLARE_ACCOUNT_ID is not set');
}
if (!process.env.CLOUDFLARE_DATABASE_ID) {
  throw new Error('CLOUDFLARE_DATABASE_ID is not set');
}
if (!process.env.CLOUDFLARE_D1_TOKEN) {
  throw new Error('CLOUDFLARE_D1_TOKEN is not set');
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './migrations',
  dialect: 'sqlite', // D1 is SQLite compatible
  driver: 'd1-http', // To push migrations directly to remote D1
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID,
    token: process.env.CLOUDFLARE_D1_TOKEN,
  },
});