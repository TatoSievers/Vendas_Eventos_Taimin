// DENTRO DE: api/lib/db.ts
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Exporta diretamente a função de query
export const query = neon(process.env.DATABASE_URL);
