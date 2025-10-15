// DENTRO DE: api/data.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const [users, events, products] = await Promise.all([
        query('SELECT id, name FROM users'),
        query('SELECT id, name FROM events'),
        query('SELECT id, name, preco FROM products')
      ]);
      return res.status(200).json({ users, events, products });
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error: any) {
    console.error('ERRO EM /api/data:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
