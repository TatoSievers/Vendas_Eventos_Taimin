import pool from '../lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function handleDelete(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID da venda inválido ou ausente.' });
    }

    try {
        const result = await pool.query('DELETE FROM sales WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Venda não encontrada.' });
        }
        return res.status(204).end();
    } catch (error: any) {
        console.error(`API Error deleting sale ${id}:`, error);
        return res.status(500).json({ error: 'Falha ao deletar a venda.', details: error.message });
    }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    const { saleData, products } = req.body;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID da venda inválido ou ausente.' });
    }
    if (!saleData || !products) {
        return res.status(400).json({ error: 'Dados da venda ou produtos ausentes.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const setClause = Object.keys(saleData).map((key, i) => `"${key}" = $${i + 1}`).join(', ');
        const saleValues = Object.values(saleData);
        const updateSaleQuery = `UPDATE sales SET ${setClause} WHERE id = $${saleValues.length + 1} RETURNING *;`;
        
        const updatedSaleResult = await client.query(updateSaleQuery, [...saleValues, id]);
        const updatedSale = updatedSaleResult.rows[0];

        await client.query('DELETE FROM sale_products WHERE sale_id = $1', [id]);
        if (products.length > 0) {
            for (const p of products) {
                await client.query(
                    'INSERT INTO sale_products (sale_id, nome_produto, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
                    [id, p.nome_produto, p.quantidade, p.preco_unitario || 0]
                );
            }
        }

        await client.query('COMMIT');
        return res.status(200).json(updatedSale);

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`API Error updating sale ${id}:`, error);
        return res.status(500).json({ error: 'Falha ao atualizar a venda.', details: error.message });
    } finally {
        client.release();
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'DELETE') {
        return handleDelete(req, res);
    }
    if (req.method === 'PUT') {
        return handlePut(req, res);
    }
    res.setHeader('Allow', ['DELETE', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}