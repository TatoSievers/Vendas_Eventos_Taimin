import pool from '../lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const CREATE_HANDLERS: { [key: string]: (payload: any) => Promise<any> } = {
    user: async (payload) => {
        const { name } = payload;
        if (!name) throw new Error("Nome do usuário é obrigatório.");
        const { rows } = await pool.query(
            'INSERT INTO app_users (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name]
        );
        return rows[0];
    },
    event: async (payload) => {
        const { name, date } = payload;
        if (!name || !date) throw new Error("Nome e data do evento são obrigatórios.");
        const { rows } = await pool.query(
            'INSERT INTO app_events (name, date) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name, date]
        );
        return rows[0];
    },
    paymentMethod: async (payload) => {
        const { name } = payload;
        if (!name) throw new Error("Nome da forma de pagamento é obrigatório.");
        const { rows } = await pool.query(
            'INSERT INTO payment_methods (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
            [name]
        );
        return rows[0];
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { type, payload } = req.body;
    const handler = CREATE_HANDLERS[type];

    if (!handler) {
        return res.status(400).json({ error: 'Tipo de criação inválido.' });
    }

    try {
        const result = await handler(payload);
        if (!result) {
            return res.status(200).json(null);
        }
        return res.status(201).json(result);
    } catch (error: any) {
        console.error(`API Error creating ${type}:`, error);
        if (error.code === '23505') {
             return res.status(409).json({ error: `Um item do tipo '${type}' com estes dados já existe.`, details: error.detail });
        }
        return res.status(500).json({ error: `Falha ao criar ${type}.`, details: error.message });
    }
}