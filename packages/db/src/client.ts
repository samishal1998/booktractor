import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}
export const sql = neon(DATABASE_URL);
export const db = drizzle({ client: sql });
