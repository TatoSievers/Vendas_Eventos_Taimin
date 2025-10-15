// DENTRO DE: api/sales/[id].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';
import { SalesData } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Um ID de venda é necessário para esta rota.' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const saleResult = await query(`SELECT * FROM sales WHERE id = $1`, [id]);
        if (saleResult.length === 0) {
          return res.status(404).json({ error: 'Venda não encontrada.' });
        }
        return res.status(200).json(saleResult[0]);

      case 'PUT':
        const saleData: SalesData = req.body;
        // ... sua lógica de atualização vai aqui ...
        console.log(`Atualizando venda com ID: ${id}`, saleData);
        return res.status(200).json({ message: 'Lógica de atualização a ser implementada.' });

      case 'DELETE':
        await query('DELETE FROM sales WHERE id = $1', [id]);
        return res.status(200).json({ message: 'Venda deletada com sucesso.' });

      case 'OPTIONS':
        res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`ERRO EM /api/sales/${id} (Método: ${req.method}):`, error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
