import { neon, neonConfig } from '@neondatabase/serverless';
import { VercelRequest, VercelResponse } from '@vercel/node';

// CORRETO: Configuração necessária para o driver do Neon na Vercel.
neonConfig.fetchConnectionCache = true;

// CORRETO: Validação para garantir que a variável de ambiente do banco de dados existe.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// CORRETO: Inicializa a conexão com o banco de dados.
const sql = neon(process.env.DATABASE_URL);

/**
 * CORRETO: Função utilitária para executar queries.
 * A lógica interna converte queries no estilo 'pg' (com $1, $2) para o formato
 * que o driver serverless do Neon espera.
 */
export async function query(queryText: string, params: any[] = []) {
  try {
    const start = Date.now();
    
    // Transforma placeholders $1, $2, etc., para o formato de template literal
    const separator = '--NEON_PARAM_SEPARATOR--';
    const queryWithSeparators = queryText.replace(/\$\d+/g, separator);
    const strings = queryWithSeparators.split(separator);

    const placeholderCount = (queryText.match(/\$\d+/g) || []).length;
    if (placeholderCount !== params.length) {
      throw new Error(`Query placeholder count (${placeholderCount}) does not match params count (${params.length}). Query: "${queryText}"`);
    }

    const result = await sql(strings as any, ...params);
    
    const duration = Date.now() - start;
    console.log('executed query', { queryText, duration, rows: Array.isArray(result) ? result.length : 0 });
    return result;
  } catch (error) {
    console.error('Error executing query:', { queryText, params, error });
    throw error;
  }
}

// CORRETO: Mantém a definição do schema do banco de dados em uma variável.
export const dbSchema = `
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
 * CORRETO: Função que inicializa o schema do banco, executando uma query por vez,
 * pois o driver serverless não suporta múltiplas declarações em uma única chamada.
 */
export async function initDb() {
  if (dbInitialized) return;
  console.log("Initializing database schema...");
  try {
    const statements = dbSchema.split(';').map(s => s.trim()).filter(s => s.length > 0