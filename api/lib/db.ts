// api/lib/db.ts

import { neon, neonConfig } from '@neondatabase/serverless';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Enable connection caching for better performance in a serverless environment.
neonConfig.fetchConnectionCache = true;

// Ensure the database URL is configured in environment variables.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Executes a SQL query against the Neon database.
 * @param queryText The SQL query string with placeholders (e.g., $1, $2).
 * @param params An array of parameters to safely inject into the query.
 * @returns The result of the query.
 */
export async function query(queryText: string, params: any[] = []) {
  try {
    const start = Date.now();
    // Fix: Spreading the `params` array helps TypeScript correctly resolve the `sql` function's overloads,
    // distinguishing between the tagged template literal and the dynamic query signature.
    const result = await sql(queryText, ...params);
    const duration = Date.now() - start;
    // Basic logging for monitoring query performance.
    console.log('Executed query', { queryText, duration, rows: Array.isArray(result) ? result.length : 0 });
    return result;
  } catch (error) {
    console.error('Error executing query:', { queryText, params, error });
    // Re-throw the error to be caught by the handler's error handling.
    throw error;
  }
}

// The complete database schema definition.
const dbSchema = `
  CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS events (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, date DATE NOT NULL);
  CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, preco NUMERIC(10, 2) NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'disponível' CHECK (status IN ('disponível', 'indisponível')));
  CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, cpf TEXT UNIQUE NOT NULL, primeiro_nome TEXT NOT NULL, sobrenome TEXT NOT NULL, email TEXT, ddd TEXT, telefone_numero TEXT, cep TEXT, logradouro_rua TEXT, numero_endereco TEXT, complemento TEXT, bairro TEXT, cidade TEXT, estado TEXT);
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE TABLE IF NOT EXISTS sales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), user_id INT REFERENCES users(id) ON DELETE SET NULL, event_id INT REFERENCES events(id) ON DELETE CASCADE, customer_id INT REFERENCES customers(id) ON DELETE RESTRICT, forma_pagamento TEXT NOT NULL, valor_total NUMERIC(10, 2) NOT NULL, observacao TEXT);
  CREATE TABLE IF NOT EXISTS sale_products (id SERIAL PRIMARY KEY, sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL, product_id INT REFERENCES products(id) ON DELETE RESTRICT, unidades INT NOT NULL, preco_unitario NUMERIC(10, 2) NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_sales_event_id ON sales(event_id);
  CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
  CREATE INDEX IF NOT EXISTS idx_sale_products_sale_id ON sale_products(sale_id);
  CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
`;

let dbInitialized = false;

/**
 * Initializes the database by creating tables if they don't exist.
 * This runs only once per serverless function instance.
 */
async function initDb() {
  if (dbInitialized) return;
  console.log("Initializing database schema...");
  try {
    // Split the schema string into individual, non-empty commands.
    const commands = dbSchema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    // Execute each command sequentially.
    for (const command of commands) {
      await query(command);
    }
    
    dbInitialized = true;
    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    // If initialization fails, subsequent queries will likely fail, but we throw to signal a critical issue.
    throw new Error('Could not initialize database.');
  }
}

// Type definition for a standard Vercel API handler.
type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;

/**
 * A higher-order function that wraps an API handler to ensure the database
 * is initialized before the handler logic runs.
 * @param handler The API handler function to wrap.
 * @returns A new handler function with database connection logic.
 */
export const withDbConnection = (handler: ApiHandler) => async (req: VercelRequest, res: VercelResponse) => {
  try {
    await initDb();
    return await handler(req, res);
  } catch (error: any) {
    console.error('API Handler Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An internal server error occurred.' });
    }
  }
};