import pool from './lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function handlePost(req: VercelRequest, res: VercelResponse) {
    const { saleData, products } = req.body;
    
    if (!saleData || !products) {
        return res.status(400).json({ error: 'Dados da venda ou produtos ausentes.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const saleColumns = Object.keys(saleData).join(', ');
        const saleValues = Object.values(saleData);
        const salePlaceholders = saleValues.map((_, i) => `$${i + 1}`).join(', ');

        const insertSaleQuery = `INSERT INTO sales (${saleColumns}) VALUES (${salePlaceholders}) RETURNING *;`;
        const newSaleResult = await client.query(insertSaleQuery, saleValues);
        const newSale = newSaleResult.rows[0];

        if (products.length > 0) {
            for (const p of products) {
                await client.query(
                    'INSERT INTO sale_products (sale_id, nome_produto, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
                    [newSale.id, p.nome_produto, p.quantidade, p.preco_unitario || 0]
                );
            }
        }

        await client.query('COMMIT');
        return res.status(201).json(newSale);

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('API Error creating sale:', error);
        const dbError = error.detail || error.message;
        const userMessage = dbError.includes('not-null constraint') ? `Erro: O campo obrigatório '${error.column}' não foi preenchido.` : 'Falha ao criar a venda.';
        return res.status(500).json({ error: userMessage, details: dbError });
    } finally {
        client.release();
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'POST') {
        return handlePost(req, res);
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}