import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from './lib/db.js';

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
    valorTotal: parseFloat(sale.valorTotal || 0), // Ensure valorTotal is a number
    produtos: (sale.produtos || []).map((p: any) => ({
      ...p,
      preco_unitario: parseFloat(p.preco_unitario || 0) // Ensure preco_unitario is a number
    })),
  };
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const [usersResult, eventsResult, productsResult, salesResult] = await Promise.all([
      query('SELECT name FROM users ORDER BY name ASC'),
      query('SELECT name, date FROM events ORDER BY name ASC'),
      query('SELECT name, preco, status FROM products ORDER BY name ASC'),
      query(`
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
        ORDER BY s.created_at DESC
      `),
    ]);
    
    const appUsers = usersResult.map((r: any) => ({ name: r.name }));
    const appEvents = eventsResult.map((r: any) => ({ 
        name: r.name, 
        date: formatDateToYYYYMMDD(r.date) 
    }));
    const appProducts = productsResult.map((r: any) => ({ name: r.name, preco: parseFloat(r.preco), status: r.status }));
    
    // Apply consistent formatting to all sales data before sending it to the client
    const allSales = salesResult.map(formatSaleForClient);

    return res.status(200).json({
      appUsers,
      appEvents,
      appProducts,
      allSales
    });

  } catch (error: any) {
    console.error('Failed to fetch initial data:', error);
    return res.status(500).json({ error: 'Failed to fetch data from the database.', details: error.message });
  }
};

export default withDbConnection(handler as any);