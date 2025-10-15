// DENTRO DE: api/setup.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './lib/db.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const commands = dbSchema.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
      for (const command of commands) {
        await query(command);
      }
      return res.status(200).json({ message: 'Database schema setup successful.' });
    }
    
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error: any) {
    console.error('ERRO EM /api/setup:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
