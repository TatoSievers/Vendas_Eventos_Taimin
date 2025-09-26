// Conteúdo para: api/sales/[id].ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../../lib/db.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  console.log(`[API /api/sales/[id]] Função iniciada. Método recebido: ${req.method}`);

  if (req.method === 'OPTIONS') {
    console.log('[API /api/sales/[id]] Requisição OPTIONS recebida. Respondendo com sucesso.');
    return res.status(200).end();
  }
  
  if (req.method === 'DELETE') {
    console.log('[API /api/sales/[id]] Método DELETE detectado. Iniciando processo de exclusão.');

    const { id } = req.query;
    console.log(`[API /api/sales/[id]] ID extraído da URL: ${id}`);

    if (typeof id !== 'string' || !id) {
      console.error('[API /api/sales/[id]] Erro: ID da venda ausente ou inválido.');
      return res.status(400).json({ error: 'O ID da venda é obrigatório e deve ser uma string.' });
    }

    try {
      console.log(`[API /api/sales/[id]] Executando query para apagar a venda com ID: ${id}`);
      await query('DELETE FROM sales WHERE id = $1', [id]);
      
      console.log(`[API /api/sales/[id]] Venda com ID: ${id} apagada com sucesso.`);
      return res.status(200).json({ message: 'Venda apagada com sucesso.' });

    } catch (error: any) {
      console.error(`[API /api/sales/[id]] Erro no banco de dados ao tentar apagar ID ${id}:`, error);
      return res.status(500).json({ error: 'Falha na consulta ao banco de dados', details: error.message });
    }
  }

  console.warn(`[API /api/sales/[id]] Método ${req.method} não é permitido. Retornando 405.`);
  res.setHeader('Allow', ['DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
};

export default withDbConnection(handler as any);