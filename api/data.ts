// DENTRO DE: api/data.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      
      // MUDANÇA 1: Adicionamos a busca por todas as vendas (allSales)
      const [users, events, products, sales] = await Promise.all([
        query('SELECT id, name FROM users ORDER BY name'),
        query('SELECT id, name, date FROM events ORDER BY date DESC'),
        query('SELECT id, name, preco, status FROM products ORDER BY name'),
        // Query para buscar todas as vendas, incluindo detalhes do cliente/evento
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
              FROM sale_products sp JOIN products p ON sp.product_id = p.id WHERE sp.sale_id = s.id
            ) as produtos
          FROM sales s
          LEFT JOIN users u ON s.user_id = u.id
          LEFT JOIN events e ON s.event_id = e.id
          LEFT JOIN customers c ON s.customer_id = c.id
          ORDER BY s.created_at DESC
        `)
      ]);

      // MUDANÇA 2: Renomeamos as chaves para bater com o que o frontend espera (appUsers, etc.)
      return res.status(200).json({ 
        appUsers: users, 
        appEvents: events, 
        appProducts: products,
        allSales: sales 
      });
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error: any) {
    console.error('ERRO EM /api/data:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
