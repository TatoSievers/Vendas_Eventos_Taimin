// DENTRO DE: api/customers/[cpf].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { cpf } = req.query;

    if (req.method === 'GET') {
      const customerResult = await query('SELECT * FROM customers WHERE cpf = $1', [cpf]);
      if (customerResult.length === 0) {
        return res.status(404).json({ error: 'Customer not found.' });
      }
      return res.status(200).json(customerResult[0]);
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error: any) {
    console.error('ERRO EM /api/customers/[cpf]:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
