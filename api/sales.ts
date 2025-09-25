import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db';
import { SalesData } from '../types';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'POST') {
    return createOrUpdateSale(req, res);
  } else if (req.method === 'PUT') {
    return createOrUpdateSale(req, res, true);
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
};

async function createOrUpdateSale(req: VercelRequest, res: VercelResponse, isEditing = false) {
  const saleData: SalesData = req.body;

  try {
    // Using `query` function which wraps sql template tag from Neon library
    // The transaction block is a single string passed to the query function.
    const transactionResult = await query(`
      BEGIN;

      -- Step 1: Find or create the customer and get their ID
      WITH customer_insert AS (
        INSERT INTO customers (cpf, primeiro_nome, sobrenome, email, ddd, telefone_numero, cep, logradouro_rua, numero_endereco, complemento, bairro, cidade, estado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (cpf) DO UPDATE SET
          primeiro_nome = EXCLUDED.primeiro_nome,
          sobrenome = EXCLUDED.sobrenome,
          email = EXCLUDED.email,
          ddd = EXCLUDED.ddd,
          telefone_numero = EXCLUDED.telefone_numero,
          cep = EXCLUDED.cep,
          logradouro_rua = EXCLUDED.logradouro_rua,
          numero_endereco = EXCLUDED.numero_endereco,
          complemento = EXCLUDED.complemento,
          bairro = EXCLUDED.bairro,
          cidade = EXCLUDED.cidade,
          estado = EXCLUDED.estado
        RETURNING id
      ),
      customer_id_cte AS (
        SELECT id FROM customer_insert
        UNION ALL
        SELECT id FROM customers WHERE cpf = $1 AND NOT EXISTS (SELECT 1 FROM customer_insert)
        LIMIT 1
      ),

      -- Step 2: Get User and Event IDs
      user_id_cte AS (SELECT id FROM users WHERE name = $14),
      event_id_cte AS (SELECT id FROM events WHERE name = $15),

      -- Step 3 (for updates): Delete old sale products
      -- This is a placeholder; actual deletion happens conditionally below if isEditing
      
      -- Step 4: Insert or Update the sale
      sale_cte AS (
        INSERT INTO sales (id, created_at, user_id, event_id, customer_id, forma_pagamento, valor_total, observacao)
        SELECT $16, $17, u.id, e.id, c.id, $18, $19, $20
        FROM user_id_cte u, event_id_cte e, customer_id_cte c
        ON CONFLICT (id) DO UPDATE SET
            user_id = (SELECT id FROM users WHERE name = $14),
            event_id = (SELECT id FROM events WHERE name = $15),
            customer_id = (SELECT id FROM customers WHERE cpf = $1),
            forma_pagamento = EXCLUDED.forma_pagamento,
            valor_total = EXCLUDED.valor_total,
            observacao = EXCLUDED.observacao
        RETURNING id
      )
      
      -- Finally, select the sale ID to use for product inserts
      SELECT id FROM sale_cte;
    `, [
        saleData.cpf, saleData.primeiroNome, saleData.sobrenome, saleData.email, saleData.ddd, saleData.telefoneNumero, saleData.cep, saleData.logradouroRua, saleData.numeroEndereco, saleData.complemento, saleData.bairro, saleData.cidade, saleData.estado, // customer data
        saleData.nomeUsuario, // user name
        saleData.nomeEvento, // event name
        isEditing ? saleData.id : saleData.id || crypto.randomUUID(), // sale ID
        saleData.created_at || new Date().toISOString(), // created_at
        saleData.formaPagamento,
        saleData.valorTotal,
        saleData.observacao
    ]);
    
    const saleId = transactionResult[0]?.id;
    if (!saleId) {
      await query('ROLLBACK;');
      throw new Error('Failed to create or retrieve sale ID in transaction.');
    }

    // If editing, first delete existing products for this sale
    if (isEditing) {
      await query('DELETE FROM sale_products WHERE sale_id = $1;', [saleId]);
    }

    // Step 5: Insert sale products
    for (const product of saleData.produtos) {
      await query(`
        INSERT INTO sale_products (sale_id, product_id, unidades, preco_unitario)
        SELECT $1, p.id, $2, $3
        FROM products p
        WHERE p.name = $4;
      `, [saleId, product.unidades, product.preco_unitario, product.nomeProduto]);
    }
    
    await query('COMMIT;');
    
    // After successful transaction, fetch the complete sale data to return
    const newSaleResult = await query(`
      SELECT 
        s.id, s.created_at, s.forma_pagamento, s.valor_total, s.observacao,
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

    const newSaleData = {...newSaleResult[0], produtos: newSaleResult[0].produtos || [] };

    return res.status(isEditing ? 200 : 201).json({ sale: newSaleData });

  } catch (error: any) {
    await query('ROLLBACK;'); // Attempt to rollback on any error
    console.error('Sale creation/update failed:', error);
    return res.status(500).json({ error: 'Database transaction failed.', details: error.message });
  }
}

export default withDbConnection(handler as any);
