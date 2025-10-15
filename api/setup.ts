// DENTRO DE: api/setup.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // A requisição POST é usada para criar novos usuários ou eventos
    if (req.method === 'POST') {
      const { type, name, date } = req.body;

      // Se for para criar um usuário
      if (type === 'user') {
        if (!name) return res.status(400).json({ error: 'User name is required.' });
        // Usamos ON CONFLICT para não dar erro se o usuário já existir
        const result = await query(
          'INSERT INTO users (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
          [name]
        );
        // Retorna o usuário criado ou um objeto vazio se ele já existia
        return res.status(201).json({ user: result[0] || { name } });
      }

      // Se for para criar um evento
      if (type === 'event') {
        if (!name || !date) return res.status(400).json({ error: 'Event name and date are required.' });
        // Usamos ON CONFLICT para não dar erro se o evento já existir
        const result = await query(
          'INSERT INTO events (name, date) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *',
          [name, date]
        );
        // Retorna o evento criado ou um objeto vazio se ele já existia
        return res.status(201).json({ event: result[0] || { name, date } });
      }

      // Se o 'type' for inválido
      return res.status(400).json({ error: 'Invalid setup type.' });
    }

    // Se o método não for POST, não é permitido
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error: any) {
    console.error('ERRO EM /api/setup:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
