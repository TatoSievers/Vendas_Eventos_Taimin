import pool from './lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const salesPromise = pool.query(`SELECT * FROM sales ORDER BY created_at DESC`);
        const productsPromise = pool.query(`SELECT * FROM sale_products`);
        const usersPromise = pool.query(`SELECT name FROM app_users ORDER BY name`);
        const eventsPromise = pool.query(`SELECT name, date FROM app_events ORDER BY name`);
        const paymentMethodsPromise = pool.query(`SELECT name FROM payment_methods ORDER BY name`);

        const [
            salesResult,
            productsResult,
            usersResult,
            eventsResult,
            paymentMethodsResult
        ] = await Promise.all([
            salesPromise,
            productsPromise,
            usersPromise,
            eventsPromise,
            paymentMethodsPromise
        ]);

        const productsBySaleId = new Map<string, any[]>();
        productsResult.rows.forEach(p => {
            if (!productsBySaleId.has(p.sale_id)) {
                productsBySaleId.set(p.sale_id, []);
            }
            productsBySaleId.get(p.sale_id)!.push({
                nomeProduto: p.nome_produto,
                unidades: p.quantidade,
            });
        });
        
        const salesWithProducts = salesResult.rows.map(sale => ({
            ...sale,
            produtos: productsBySaleId.get(sale.id) || []
        }));

        return res.status(200).json({
            sales: salesWithProducts,
            users: usersResult.rows,
            events: eventsResult.rows,
            paymentMethods: paymentMethodsResult.rows,
        });

    } catch (error: any) {
        console.error('API Error fetching initial data:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}