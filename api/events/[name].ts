// DENTRO DE: api/events/[name].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { name } = req.query;

    if (req.method === 'GET') {
      const eventResult = await query('SELECT * FROM events WHERE name = $1', [name]);
      if (eventResult.length === 0) {
        return res.status(404).json({ error: 'Event not found.' });
      }
      return res.status(200).json(eventResult[0]);
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    
  } catch (error: any) {
    console.error('ERRO EM /api/events/[name]:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
