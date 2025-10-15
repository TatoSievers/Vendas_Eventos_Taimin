// DENTRO DO ARQUIVO: api/sales/index.ts
// ESTE É UM CÓDIGO DE TESTE PARA ISOLAR O PROBLEMA

import { VercelRequest, VercelResponse } from '@vercel/node';

// Não vamos usar o 'withDbConnection' ou a função 'query' de propósito.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  
  console.log(`[TESTE DE FUMAÇA] Método recebido: ${req.method}`);

  // Se a requisição for POST, retorne uma mensagem de sucesso simples.
  if (req.method === 'POST') {
    console.log('[TESTE DE FUMAÇA] O método POST foi recebido e processado com sucesso.');
    return res.status(200).json({ message: 'Teste de POST bem-sucedido!' });
  }

  // Se for GET, também retorne uma mensagem simples.
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Teste de GET bem-sucedido!' });
  }

  // Se for qualquer outro método, retorne o erro 405.
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Método ${req.method} não permitido por este teste.`);
}
