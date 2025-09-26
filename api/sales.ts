import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from './lib/db.js';
import { SalesData } from '../types';

// Helper function to format date to YYYY-MM-DD
const formatDateToYYYYMMDD = (dateInput: string | Date | null): string => {
  if (!dateInput) return ''; 
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to ensure data types from the database are correctly formatted for the client.
const formatSaleForClient = (sale: any) => {
  return {
    ...sale,
    dataEvento: formatDateToYYYYMMDD(sale.dataEvento),
    valorTotal: parseFloat(sale.valorTotal || 0),
    produtos: (sale.produtos || []).map((p: any) => ({
      ...p,
      preco_unitario: parseFloat(p.preco_unitario || 0)
    })),
  };
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'GET') {
    return getAllSales(req, res);
  } else if (req.method === 'POST') {
    return createSale(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
};

async function getAllSales(req: VercelRequest, res: VercelResponse) {
    try {
        const salesResult = await query(`
            SELECT 
            s.id, s.created_at, s.forma_pagamento, s.valor_total as "valorTotal", s.observacao,
            u.name as "nomeUsuario",
            e.name as "nomeEvento", e.date as "dataEvento",
            c.primeiro_nome as "primeiroNome", c.sobrenome, c.cpf, c.email, c.ddd, c.telefone_numero as "telefoneNumero",
            c.logradouro_rua as "logradouroRua", c.numero_endereco as "numeroEndereco", c.complemento, c.bairro, c.cidade, c.estado, c.cep,
            (
                SELECT json_agg(json_build_object(
                'nomeProduto', p.name,
                'unidades', sp.unidades,
                'preco_unitario', sp.preco_unitario
                ))
                FROM sale_products sp
                JOIN products p ON sp.product_id = p.id
                WHERE sp.sale_id = s.id
            ) as produtos
            FROM sales s
            JOIN users u ON s.user_id = u.id
            JOIN events e ON s.event_id = e.id
            JOIN customers c ON s.customer_id = c.id
            ORDER BY s.created_at DESC
        `);
        const allSales = salesResult.map(formatSaleForClient);
        return res.status(200).json(allSales);
    } catch (error: any) {
        console.error('Failed to fetch sales:', error);
        return res.status(500).json({ error: 'Failed to fetch sales from the database.', details: error.message });
    }
}


async function createSale(req: VercelRequest, res: VercelResponse) {
  const saleData: SalesData = req.body;

  try {
    // Step 1: Upsert customer and get their ID.
    const customerResult = await query(`
      INSERT INTO customers (cpf, primeiro_nome, sobrenome, email, ddd, telefone_numero, cep, logradouro_rua, numero_endereco, complemento, bairro, cidade, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (cpf) DO UPDATE SET
        primeiro_nome = EXCLUDED.primeiro_nome, sobrenome = EXCLUDED.sobrenome, email = EXCLUDED.email, ddd = EXCLUDED.ddd, telefone_numero = EXCLUDED.telefone_numero, cep = EXCLUDED.cep, logradouro_rua = EXCLUDED.logradouro_rua, numero_endereco = EXCLUDED.numero_endereco, complemento = EXCLUDED.complemento, bairro = EXCLUDED.bairro, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado
      RETURNING id;
    `, [
        saleData.cpf, saleData.primeiroNome, saleData.sobrenome, saleData.email, saleData.ddd, saleData.telefoneNumero, saleData.cep, saleData.logradouroRua, saleData.numeroEndereco, saleData.complemento, saleData.bairro, saleData.cidade, saleData.estado
    ]);
    const customerId = customerResult[0]?.id;
    if (!customerId) throw new Error('Falha ao criar ou encontrar o cliente.');

    // Step 2: Get User and Event IDs
    const userResult = await query('SELECT id FROM users WHERE name = $1', [saleData.nomeUsuario]);
    const userId = userResult[0]?.id;
    if (!userId) throw new Error(`Usuário '${saleData.nomeUsuario}' não encontrado.`);

    const eventResult = await query('SELECT id FROM events WHERE name = $1', [saleData.nomeEvento]);
    const eventId = eventResult[0]?.id;
    if (!eventId) throw new Error(`Evento '${saleData.nomeEvento}' não encontrado.`);

    const saleId = saleData.id; // Use the client-generated UUID

    // Step 3: Insert the new sale record
    await query(`
      INSERT INTO sales (id, created_at, user_id, event_id, customer_id, forma_pagamento, valor_total, observacao)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `, [
        saleId, saleData.created_at, userId, eventId, customerId,
        saleData.formaPagamento, saleData.valorTotal, saleData.observacao
    ]);
    
    // Step 4: Insert sale products associations
    if (saleData.produtos && saleData.produtos.length > 0) {
        const productNames = saleData.produtos.map(p => p.nomeProduto);
        const productIdsResult = await query(`SELECT id, name FROM products WHERE name = ANY($1::text[])`, [productNames]);
        const productIdMap = new Map(productIdsResult.map((p: any) => [p.name, p.id]));

        for (const product of saleData.produtos) {
            const productId = productIdMap.get(product.nomeProduto);
            if (!productId) throw new Error(`Produto '${product.nomeProduto}' não encontrado no banco de dados.`);
            await query(`
                INSERT INTO sale_products (sale_id, product_id, unidades, preco_unitario)
                VALUES ($1, $2, $3, $4);
            `, [saleId, productId, product.unidades, product.preco_unitario]);
        }
    }
    
    // After successful transaction, fetch the complete sale data to return
    const newSaleResult = await query(`
      SELECT 
        s.id, s.created_at, s.forma_pagamento, s.valor_total as "valorTotal", s.observacao,
        u.name as "nomeUsuario",
        e.name as "nomeEvento", e.date as "dataEvento",
        c.primeiro_nome as "primeiroNome", c.sobrenome, c.cpf, c.email, c.ddd, c.telefone_numero as "telefoneNumero",
        c.logradouro_rua as "logradouroRua", c.numero_endereco as "numeroEndereco", c.complemento, c.bairro, c.cidade, c.estado, c.cep,
        (
          SELECT json_agg(json_build_object(
            'nomeProduto', p.name,
            'unidades', sp.unidades,
            'preco_unitario', sp.preco_unitario
          ))
          FROM sale_products sp
          JOIN products p ON sp.product_id = p.id
          WHERE sp.sale_id = s.id
        ) as produtos
      FROM sales s
      JOIN users u ON s.user_id = u.id
      JOIN events e ON s.event_id = e.id
      JOIN customers c ON s.customer_id = c.id
      WHERE s.id = $1
    `, [saleId]);
    
    if (newSaleResult.length === 0) {
      throw new Error('Não foi possível recuperar os dados da venda após o salvamento.');
    }

    const formattedSale = formatSaleForClient(newSaleResult[0]);

    return res.status(201).json({ sale: formattedSale });

  } catch (error: any) {
    console.error('Sale creation failed:', error);
    return res.status(500).json({ error: 'Falha na operação com o banco de dados.', details: error.message });
  }
}

export default withDbConnection(handler as any);