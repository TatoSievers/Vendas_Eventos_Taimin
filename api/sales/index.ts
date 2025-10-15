// DENTRO DE: api/sales/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js'; // Importa a nova função simplificada
import { SalesData } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET':
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

      case 'POST':
        const saleData: SalesData = req.body;
        console.log('[api/sales/index] Sucesso! Dados recebidos para criar venda:', saleData);
        // LÓGICA DO BANCO DE DADOS PARA CRIAR VENDA VAI AQUI
        return res.status(201).json({ message: 'Venda criada com sucesso!', data: saleData });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('ERRO CRÍTICO NO HANDLER:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
