// Importa os tipos do Vercel para requisição (req) e resposta (res)
import { VercelRequest, VercelResponse } from '@vercel/node';

// Importa as funções do seu arquivo de conexão com o banco de dados.
// O caminho '../../lib/db.js' assume que a pasta 'lib' está dentro de 'api'.
// Estrutura: /api/lib/db.js e /api/sales/[id].ts
import { withDbConnection, query } from '../../lib/db.js';

// 'handler' é a função principal que a Vercel executará para este endpoint.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  // --- INÍCIO DO DIAGNÓSTICO ---
  // Log detalhado para sabermos que a função foi chamada e qual o método.
  // Isso é crucial para resolver o problema.
  console.log(`[API /api/sales/[id]] Função iniciada. Método recebido: ${req.method}`);

  // O navegador envia uma requisição 'OPTIONS' antes de 'DELETE' para verificar permissões (CORS).
  // É uma boa prática responder com sucesso (status 200) a essa requisição.
  if (req.method === 'OPTIONS') {
    console.log('[API /api/sales/[id]] Requisição OPTIONS recebida. Respondendo com sucesso.');
    return res.status(200).end();
  }
  
  // Este é o bloco de código que deve ser executado para apagar um registro.
  if (req.method === 'DELETE') {
    console.log('[API /api/sales/[id]] Método DELETE detectado. Iniciando processo de exclusão.');

    // --- VERIFICAÇÃO DO ID ---
    // O ID da venda vem da URL (ex: /api/sales/12345). O Vercel o coloca em 'req.query'.
    const { id } = req.query;
    console.log(`[API /api/sales/[id]] ID extraído da URL: ${id}`);

    // Validação para garantir que o ID não está faltando e é uma string.
    if (typeof id !== 'string' || !id) {
      console.error('[API /api/sales/[id]] Erro: ID da venda ausente ou inválido.');
      return res.status(400).json({ error: 'O ID da venda é obrigatório e deve ser uma string.' });
    }

    // --- BLOCO DE EXECUÇÃO ---
    // Usamos 'try...catch' para capturar qualquer erro que aconteça durante a comunicação com o banco.
    try {
      console.log(`[API /api/sales/[id]] Executando query para apagar a venda com ID: ${id}`);
      // Executa a query SQL para apagar a venda. O '$1' é substituído pelo 'id' de forma segura.
      await query('DELETE FROM sales WHERE id = $1', [id]);
      
      console.log(`[API /api/sales/[id]] Venda com ID: ${id} apagada com sucesso.`);
      // Se a query for bem-sucedida, retorna uma mensagem de sucesso.
      return res.status(200).json({ message: 'Venda apagada com sucesso.' });

    } catch (error: any) {
      // --- TRATAMENTO DE ERRO ---
      // Se ocorrer um erro no 'try', o 'catch' é executado.
      console.error(`[API /api/sales/[id]] Erro no banco de dados ao tentar apagar ID ${id}:`, error);
      // Retorna um erro 500 (Erro Interno do Servidor) com detalhes.
      return res.status(500).json({ error: 'Falha na consulta ao banco de dados', details: error.message });
    }
  }

  // --- RESPOSTA PADRÃO PARA MÉTODOS NÃO PERMITIDOS ---
  // Se a requisição não for 'OPTIONS' nem 'DELETE', ela cairá aqui.
  // É aqui que o erro 405 é gerado pelo seu próprio código.
  console.warn(`[API /api/sales/[id]] Método ${req.method} não é permitido. Retornando 405.`);
  res.setHeader('Allow', ['DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
};

// Exporta a função 'handler' envolvida pelo seu conector de banco de dados.
export default withDbConnection(handler as any);