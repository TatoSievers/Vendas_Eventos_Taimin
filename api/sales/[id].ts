// Conteúdo completo para o arquivo: api/sales/[id].ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js'; // Garanta que este caminho está correto

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // --- LINHA DE DIAGNÓSTICO ADICIONADA ---
  // Esta linha é crucial para registrar o método HTTP recebido pela função.
  console.log(`MÉTODO HTTP RECEBIDO: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'DELETE') {
    const { id } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Sale ID is required' });
    }

    try {
      await query('DELETE FROM sales WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Sale deleted successfully.' });
    } catch (error: any) {
      console.error(`Failed to delete sale ${id}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
  }

  res.setHeader('Allow', ['DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

export default withDbConnection(handler as any);
