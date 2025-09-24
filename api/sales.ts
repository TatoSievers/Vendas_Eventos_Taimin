import { db } from '../lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lida com POST para criar uma nova venda
async function handlePost(req: VercelRequest, res: VercelResponse) {
    const { saleData, products } = req.body;
    
    if (!saleData || !products) {
        return res.status(400).json({ error: 'Dados da venda ou produtos ausentes.' });
    }

    const client = await db.query('BEGIN', []); // Inicia a transação

    try {
        // Insere na tabela 'sales'
        const saleColumns = Object.keys(saleData).join(', ');
        const saleValues = Object.values(saleData);
        const salePlaceholders = saleValues.map((_, i) => `$${i + 1}`).join(', ');

        const insertSaleQuery = `INSERT INTO sales (${saleColumns}) VALUES (${salePlaceholders}) RETURNING *;`;
        const newSaleResult = await db.query(insertSaleQuery, saleValues);
        const newSale = newSaleResult.rows[0];

        // Insere na tabela 'sale_products'
        if (products.length > 0) {
            const productInserts = products.map((p: any) => {
                return db.query(
                    'INSERT INTO sale_products (sale_id, nome_produto, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
                    [newSale.id, p.nome_produto, p.quantidade, p.preco_unitario || 0]
                );
            });
            await Promise.all(productInserts);
        }

        await db.query('COMMIT', []); // Confirma a transação
        return res.status(201).json(newSale);

    } catch (error: any) {
        await db.query('ROLLBACK', []); // Desfaz a transação em caso de erro
        console.error('API Error creating sale:', error);
        return res.status(500).json({ error: 'Falha ao criar a venda.', details: error.message });
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
