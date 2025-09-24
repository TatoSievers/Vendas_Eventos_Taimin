import { Pool } from 'pg';

// A Vercel preenche automaticamente a variável de ambiente POSTGRES_URL
// quando você conecta um projeto do Neon.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export const db = {
  query: (text: string, params: any[]) => pool.query(text, params),
};
