// api/sales/[id].ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js';
import { SalesData } from '../../types';

// Helper function to format date to YYYY-MM-DD, handling potential nulls/invalid dates.
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
  // --- DIAGNOSTIC LINE AS REQUESTED ---
  console.log(`[api/sales/[id]] Received Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return getSaleById(req, res);
  }

  if (req.method === 'PUT') {
    return updateSale(req, res);
  }
  
  if (req.method === 'DELETE') {
    return deleteSale(req, res);
  }

  // If the method is not handled above, it is not allowed.
  res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

async function getSaleById(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (typeof id !== 'string' || !id) {
        return res.status(400).json({ error: 'Sale ID is required and must be a string.' });
    }

    try {
        const saleResult = await query(`
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
        `, [id]);

        if (saleResult.length === 0) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        const formattedSale = formatSaleForClient(saleResult[0]);
        return res.status(200).json(formattedSale);

    } catch (error: any) {
        console.error(`Failed to fetch sale with ID ${id}:`, error);
        return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
}

async function updateSale(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    if (typeof id !== 'string' || !id) {
        return res.status(400).json({ error: 'Sale ID is required.' });
    }
    const saleData: SalesData = req.body;

    try {
        const saleCheck = await query('SELECT customer_id FROM sales WHERE id = $1', [id]);
        const customerId = saleCheck[0]?.customer_id;
        if (!customerId) {
            return res.status(404).json({ error: 'Sale to update not found.' });
        }
        
        // Step 1: Update customer details
        await query(`
            UPDATE customers SET 
                primeiro_nome = $1, sobrenome = $2, email = $3, ddd = $4, telefone_numero = $5, 
                cep = $6, logradouro_rua = $7, numero_endereco = $8, complemento = $9, 
                bairro = $10, cidade = $11, estado = $12
            WHERE id = $13;
        `, [
            saleData.primeiroNome, saleData.sobrenome, saleData.email, saleData.ddd, saleData.telefoneNumero,
            saleData.cep, saleData.logradouroRua, saleData.numeroEndereco, saleData.complemento,
            saleData.bairro, saleData.cidade, saleData.estado, customerId
        ]);
        
        // Step 2: Update main sale record
        await query(`
            UPDATE sales SET forma_pagamento = $1, valor_total = $2, observacao = $3
            WHERE id = $4;
        `, [saleData.formaPagamento, saleData.valorTotal, saleData.observacao, id]);

        // Step 3: Sync products (delete old, insert new)
        await query('DELETE FROM sale_products WHERE sale_id = $1', [id]);
        
        if (saleData.produtos && saleData.produtos.length > 0) {
            const productNames = saleData.produtos.map(p => p.nomeProduto);
            const productIdsResult = await query(`SELECT id, name FROM products WHERE name = ANY($1::text[])`, [productNames]);
            const productIdMap = new Map(productIdsResult.map((p: any) => [p.name, p.id]));

            for (const product of saleData.produtos) {
                const productId = productIdMap.get(product.nomeProduto);
                if (!productId) throw new Error(`Product '${product.nomeProduto}' not found in database.`);
                await query(`
                    INSERT INTO sale_products (sale_id, product_id, unidades, preco_unitario)
                    VALUES ($1, $2, $3, $4);
                `, [id, productId, product.unidades, product.preco_unitario]);
            }
        }
        
        // Step 4: Fetch and return the fully updated sale data
        const updatedSaleResult = await query(`
            SELECT 
                s.id, s.created_at, s.forma_pagamento, s.valor_total as "valorTotal", s.observacao,
                u.name as "nomeUsuario",
                e.name as "nomeEvento", e.date as "dataEvento",
                c.primeiro_nome as "primeiroNome", c.sobrenome, c.cpf, c.email, c.ddd, c.telefone_numero as "telefoneNumero",
                c.logradouro_rua as "logradouroRua", c.numero_endereco as "numeroEndereco", c.complemento, c.bairro, c.cidade, c.estado, c.cep,
                (
                    SELECT json_agg(json_build_object('nomeProduto', p.name, 'unidades', sp.unidades, 'preco_unitario', sp.preco_unitario))
                    FROM sale_products sp JOIN products p ON sp.product_id = p.id WHERE sp.sale_id = s.id
                ) as produtos
            FROM sales s
            JOIN users u ON s.user_id = u.id
            JOIN events e ON s.event_id = e.id
            JOIN customers c ON s.customer_id = c.id
            WHERE s.id = $1
        `, [id]);

        if (updatedSaleResult.length === 0) {
            throw new Error('Could not retrieve sale data after update.');
        }

        const formattedSale = formatSaleForClient(updatedSaleResult[0]);
        return res.status(200).json({ sale: formattedSale });

    } catch (error: any) {
        console.error(`Failed to update sale with ID ${id}:`, error);
        return res.status(500).json({ error: 'Database query failed during update.', details: error.message });
    }
}


async function deleteSale(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'Sale ID is required and must be a string.' });
    }

    try {
      await query('DELETE FROM sales WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Sale deleted successfully.' });
    } catch (error: any) {
      console.error(`Failed to delete sale with ID ${id}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
}

// Wrap the handler with the database connection logic.
export default withDbConnection(handler as any);