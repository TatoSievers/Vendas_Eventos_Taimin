import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js';
import { SalesData } from '../../types';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  console.log(`[api/sales/index] Received Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return getAllSales(req, res);
  }

  if (req.method === 'POST') {
    return createSale(req, res);
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

async function getAllSales(_req: VercelRequest, res: VercelResponse) {
  try {
    const salesResult = await query(`
      SELECT s.id, s.created_at, s.valor_total as "valorTotal", e.name as "nomeEvento", c.primeiro_nome as "primeiroNome", c.sobrenome
      FROM sales s
      JOIN events e ON s.event_id = e.id
      JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC;
    `);
    
    const formattedSales = salesResult.map((sale: any) => ({
      ...sale,
      valorTotal: parseFloat(sale.valorTotal || 0)
    }));

    return res.status(200).json(formattedSales);

  } catch (error: any) {
    console.error('Failed to fetch all sales:', error);
    return res.status(500).json({ error: 'Database query failed', details: error.message });
  }
}

async function createSale(req: VercelRequest, res: VercelResponse) {
  try {
    const saleData: SalesData = req.body;

    // SUA LÓGICA PARA INSERIR UMA NOVA VENDA VAI AQUI

    console.log('Dados recebidos para criar venda:', saleData);
    
    return res.status(201).json({ message: 'Venda criada com sucesso!', data: saleData });

  } catch (error: any) {
    console.error('Failed to create sale:', error);
    return res.status(500).json({ error: 'Database query failed', details: error.message });
  }
}

export default withDbConnection(handler as any);
