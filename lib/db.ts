import { neon, neonConfig } from '@neondatabase/serverless';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Required for Vercel/Neon connection
// See: https://neon.tech/docs/serverless/serverless-driver#get-a-connection-string
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);

// A simple utility for logging and executing queries.
export async function query(queryText: string, params: any[] = []) {
  try {
    const start = Date.now();
    const result = await sql(queryText, params);
    const duration = Date.now() - start;
    console.log('executed query', { queryText, duration, rows: Array.isArray(result) ? result.length : 0 });
    return result;
  } catch (error) {
    console.error('Error executing query:', { queryText, params, error });
    throw error;
  }
}

export const dbSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    date DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'disponível' CHECK (status IN ('disponível', 'indisponível'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    cpf TEXT UNIQUE NOT NULL,
    primeiro_nome TEXT NOT NULL,
    sobrenome TEXT NOT NULL,
    email TEXT,
    ddd TEXT,
    telefone_numero TEXT,
    cep TEXT,
    logradouro_rua TEXT,
    numero_endereco TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT
  );
  
  -- Use gen_random_uuid() for the ID to match client-side crypto.randomUUID()
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id) ON DELETE RESTRICT,
    forma_pagamento TEXT NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL,
    observacao TEXT
  );

  CREATE TABLE IF NOT EXISTS sale_products (
    id SERIAL PRIMARY KEY,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    unidades INT NOT NULL,
    preco_unitario NUMERIC(10, 2) NOT NULL
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_sales_event_id ON sales(event_id);
  CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
  CREATE INDEX IF NOT EXISTS idx_sale_products_sale_id ON sale_products(sale_id);
  CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
`;

let dbInitialized = false;

// Function to ensure the database schema is created.
export async function initDb() {
  if (dbInitialized) return;
  console.log("Initializing database schema...");
  try {
    // The @neondatabase/serverless driver does not support multi-statement queries.
    // We must split the schema into individual statements and execute them one by one.
    const statements = dbSchema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      await query(statement);
    }
    
    dbInitialized = true;
    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    throw new Error('Could not initialize database.');
  }
}

// Higher-order function to wrap API handlers with DB initialization and error handling
export const withDbConnection = (
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>
) => async (req: VercelRequest, res: VercelResponse) => {
  try {
    await initDb();
    await handler(req, res);
  } catch (error: any) {
    console.error('API Handler Error:', error);
    if (!res.headersSent) {
      const status = error.status || 500;
      const message = error.message || 'An internal server error occurred.';
      res.status(status).json({ error: message });
    }
  }
};