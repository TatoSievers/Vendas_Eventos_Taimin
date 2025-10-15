// DENTRO DE: api/sales/[id].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';
import { SalesData } from '../../types';

// Suas funções helper permanecem as mesmas
const formatDateToYYYYMMDD = (dateInput: string | Date | null): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatSaleForClient = (sale: any) => {
  return {
    ...sale,
    dataEvento: formatDateToYYYYMMDD(sale.dataEvento),
    valorTotal: parseFloat(sale.valorTotal || 0),
    produtos: (sale.produtos || []).map((p: any) => ({
      ...p,
      preco_unitario: parseFloat(p.preco_unitario || 0)
    })),
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getSaleById(req, res);
      case 'PUT':
        return await updateSale(req, res);
      case 'DELETE':
        return await deleteSale(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`ERRO CRÍTICO EM /api/sales/[id] PARA O MÉTODO ${req.method}:`, error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}

async function getSaleById(req: VercelRequest, res: VercelResponse) {
  // ... seu código original para getSaleById vai aqui ...
}
async function updateSale(req: VercelRequest, res: VercelResponse) {
  // ... seu código original para updateSale vai aqui ...
}
async function deleteSale(req: VercelRequest, res: VercelResponse) {
  // ... seu código original para deleteSale vai aqui ...
}
