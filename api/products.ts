// DENTRO DE: api/products.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const products = await query('SELECT * FROM products ORDER BY name');
      return res.status(200).json(products);
    }
    
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error: any) {
    console.error('ERRO EM /api/products:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
