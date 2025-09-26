// api/sales/[id].ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js';

// Helper function to format date to YYYY-MM-DD, handling potential nulls/invalid dates.
const formatDateToYYYYMMDD = (dateInput: string | Date | null): string => {
  if (!dateInput) return ''; 
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to ensure data types from the database are correctly formatted for the client.
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

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // --- DIAGNOSTIC LINE AS REQUESTED ---
  console.log(`[api/sales/[id]] Received Method: ${req.method}`);

  // Handle CORS preflight requests from the browser.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return getSaleById(req, res);
  }

  if (req.method === 'DELETE') {
    return deleteSale(req, res);
  }

  // If the method is not handled above, it is not allowed.
  res.setHeader('Allow', ['GET', 'DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

async function getSaleById(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (typeof id !== 'string' || !id) {
        return res.status(400).json({ error: 'Sale ID is required and must be a string.' });
    }

    try {
        const saleResult = await query(`
            SELECT 
                s.id, s.created_at, s.forma_pagamento, s.valor_total as "valorTotal", s.observacao,
                u.name as "nomeUsuario",
                e.name as "nomeEvento", e.date as "dataEvento",
                c.primeiro_nome as "primeiroNome", c.sobrenome, c.cpf, c.email, c.ddd, c.telefone_numero as "telefoneNumero",
                c.logradouro_rua as "logradouroRua", c.numero_endereco as "numeroEndereco", c.complemento, c.bairro, c.cidade, c.estado, c.cep,
                (
                    SELECT json_agg(json_build_object(
                        'nomeProduto', p.name,
                        'unidades', sp.unidades,
                        'preco_unitario', sp.preco_unitario
                    ))
                    FROM sale_products sp
                    JOIN products p ON sp.product_id = p.id
                    WHERE sp.sale_id = s.id
                ) as produtos
            FROM sales s
            JOIN users u ON s.user_id = u.id
            JOIN events e ON s.event_id = e.id
            JOIN customers c ON s.customer_id = c.id
            WHERE s.id = $1
        `, [id]);

        if (saleResult.length === 0) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        const formattedSale = formatSaleForClient(saleResult[0]);
        return res.status(200).json(formattedSale);

    } catch (error: any) {
        console.error(`Failed to fetch sale with ID ${id}:`, error);
        return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
}

async function deleteSale(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'Sale ID is required and must be a string.' });
    }

    try {
      await query('DELETE FROM sales WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Sale deleted successfully.' });
    } catch (error: any) {
      console.error(`Failed to delete sale with ID ${id}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
}

// Wrap the handler with the database connection logic.
export default withDbConnection(handler as any);
