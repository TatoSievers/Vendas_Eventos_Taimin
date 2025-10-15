// DENTRO DO ARQUIVO: api/sales/index.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js';
import { SalesData } from '../../types';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Refatorado para usar 'switch' para mais clareza e robustez.
  switch (req.method) {
    case 'GET':
      return await getAllSales(req, res);
    
    case 'POST':
      return await createSale(req, res);

    // O método OPTIONS é necessário para requisições complexas (CORS)
    case 'OPTIONS':
      return res.status(200).end();

    default:
      // Se o método não for GET, POST ou OPTIONS, ele é rejeitado.
      console.log(`[api/sales/index] Método não suportado recebido: ${req.method}`);
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

// --- FUNÇÃO PARA BUSCAR TODAS AS VENDAS ---
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
    // O erro já é logado pela função query() em db.ts
    return res.status(500).json({ error: 'Falha ao buscar vendas.', details: error.message });
  }
}

// --- FUNÇÃO PARA CRIAR UMA NOVA VENDA ---
async function createSale(req: VercelRequest, res: VercelResponse) {
  try {
    const saleData: SalesData = req.body;

    // =============================================================
    // SUA LÓGICA COMPLETA PARA INSERIR UMA NOVA VENDA E CLIENTE NO BANCO
    // =============================================================

    console.log('[api/sales/index] Sucesso! Dados recebidos para criar venda:', saleData);
    
    // Resposta temporária de sucesso
    return res.status(201).json({ message: 'Venda criada com sucesso!', data: saleData });

  } catch (error: any) {
    // O erro já é logado pela função query() em db.ts
    return res.status(500).json({ error: 'Falha ao criar venda.', details: error.message });
  }
}

// O wrapper agora apenas lida com erros inesperados.
export default withDbConnection(handler as any);
