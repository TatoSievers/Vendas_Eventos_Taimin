// api/lib/db.ts

import { neon, neonConfig } from '@neondatabase/serverless';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Ativa o cache de conexão, que é essencial para o desempenho
neonConfig.fetchConnectionCache = true;

// Valida se a variável de ambiente está configurada
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Cria a função de query usando a URL de conexão
const sql = neon(process.env.DATABASE_URL);

/**
 * Função principal para executar queries no banco de dados.
 * Inclui logs para monitoramento.
 */
export async function query(queryText: string, params: any[] = []) {
  try {
    const start = Date.now();
    const result = await sql(queryText, params);
    const duration = Date.now() - start;
    console.log('Executed query', { queryText, duration, rows: Array.isArray(result) ? result.length : 0 });
    return result;
  } catch (error) {
    console.error('DATABASE QUERY ERROR:', { queryText, error });
    // Re-lança o erro para ser capturado pelo handler da API
    throw error;
  }
}

// ATENÇÃO: A lógica de inicialização do schema (initDb) foi REMOVIDA.
// O schema deve ser gerenciado diretamente no seu banco de dados Neon,
// não recriado em cada requisição da API.

type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;

/**
 * Wrapper simples para handlers de API que adiciona um bloco try-catch genérico
 * para capturar erros inesperados.
 */
export const withDbConnection = (handler: ApiHandler) => async (req: VercelRequest, res: VercelResponse) => {
  try {
    // A chamada para initDb() foi removida daqui.
    return await handler(req, res);
  } catch (error: any) {
    console.error('API HANDLER UNCAUGHT ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'An internal server error occurred.', 
        details: error.message 
      });
    }
  }
};
