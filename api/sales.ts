import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from './lib/db.js';

// A função principal que lida com as requisições para /api/sales
const handler = async (_req: VercelRequest, res: VercelResponse) => {
  
  // Este endpoint só vai lidar com o método GET para listar todas as vendas.
  // Usamos '_req' para indicar ao sistema que a variável da requisição é intencionalmente não utilizada.
  if (_req.method === 'GET') {
    try {
      // Query para buscar todas as vendas com alguns detalhes.
      const result = await query(`
        SELECT 
          s.id, 
          s.created_at, 
          s.valor_total,
          u.name as "nomeUsuario",
          e.name as "nomeEvento"
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN events e ON s.event_id = e.id
        ORDER BY s.created_at DESC
      `);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro ao buscar vendas:", error);
      return res.status(500).json({ error: 'Falha ao buscar vendas', details: error.message });
    }
  }

  // Se o método não for GET, retorna o erro 405.
  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Método ${_req.method} não permitido`);
};

export default withDbConnection(handler);