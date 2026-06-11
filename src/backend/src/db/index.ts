/**
 * Database connection and schema initialization
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';
import * as schema from './schema/index.js';

let db: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

export async function createDb() {
  if (db) {
    return db;
  }

  client = postgres(env.DATABASE_URL, {
    max: 10,
    onnotice: env.NODE_ENV === 'development' ? console.log : undefined,
  });

  db = drizzle(client, {
    schema,
    logger: env.NODE_ENV === 'development',
  });

  console.log('Database connected');
  return db;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
  if (db) {
    db = null;
  }
}

export { schema };
export type Database = ReturnType<typeof drizzle>;
