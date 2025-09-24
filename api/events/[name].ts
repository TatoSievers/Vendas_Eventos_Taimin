import { db } from '../../lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Nome do evento inválido ou ausente.' });
    }
    
    const eventName = decodeURIComponent(name);
    const client = await db.query('BEGIN', []);

    try {
        // Encontra os IDs das vendas associadas ao evento
        const salesToDelete = await db.query('SELECT id FROM sales WHERE nomeevento = $1', [eventName]);
        const saleIds = salesToDelete.rows.map(r => r.id);

        // Deleta produtos associados a essas vendas
        if (saleIds.length > 0) {
            await db.query('DELETE FROM sale_products WHERE sale_id = ANY($1::uuid[])', [saleIds]);
        }
        
        // Deleta as vendas
        await db.query('DELETE FROM sales WHERE nomeevento = $1', [eventName]);

        // Deleta o evento
        await db.query('DELETE FROM app_events WHERE name = $1', [eventName]);

        await db.query('COMMIT', []);
        return res.status(204).end();

    } catch (error: any) {
        await db.query('ROLLBACK', []);
        console.error(`API Error deleting event ${eventName}:`, error);
        return res.status(500).json({ error: 'Falha ao deletar o evento.', details: error.message });
    }
}
