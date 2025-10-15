Com certeza\! Aqui está o código completo e corrigido para o seu arquivo **`api/sales/index.ts`**.

A única alteração foi na linha 31, onde `req` foi renomeado para `_req` para resolver o erro `TS6133` que você encontrou. Agora ele deve funcionar sem problemas.

**Copie e cole este código inteiro no seu arquivo `api/sales/index.ts`:**

```typescript
// DENTRO DO NOVO ARQUIVO: api/sales/index.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js'; // Importando suas funções do banco
import { SalesData } from '../../types'; // Importando seu tipo, se necessário

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // --- DIAGNÓSTICO ---
  console.log(`[api/sales/index] Received Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Se o método for GET, a requisição quer a LISTA de todas as vendas
  if (req.method === 'GET') {
    return getAllSales(req, res);
  }

  // Se o método for POST, a requisição quer CRIAR uma nova venda
  if (req.method === 'POST') {
    return createSale(req, res);
  }

  // Se o método não for um dos acima, não é permitido
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

// --- FUNÇÃO PARA BUSCAR TODAS AS VENDAS ---
async function getAllSales(_req: VercelRequest, res: VercelResponse) { // <-- A CORREÇÃO ESTÁ AQUI
  try {
    // =============================================================
    // SUA LÓGICA PARA BUSCAR TODAS AS VENDAS NO BANCO DE DADOS AQUI
    // Exemplo:
    const salesResult = await query(`
      SELECT s.id, s.created_at, s.valor_total as "valorTotal", e.name as "nomeEvento", c.primeiro_nome as "primeiroNome", c.sobrenome
      FROM sales s
      JOIN events e ON s.event_id = e.id
      JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC;
    `);
    // =============================================================
    
    // Formata os dados antes de enviar para o cliente
    const formattedSales = salesResult.map((sale: any) => ({
      ...sale,
      valorTotal: parseFloat(sale.valorTotal || 0)
    }));

    return res.status(200).json(formattedSales);

  } catch (error: any) {
    console.error('Failed to fetch all sales:', error);
    return res.status(500).json({ error: 'Database query failed', details: error.message });
  }
}

// --- FUNÇÃO PARA CRIAR UMA NOVA VENDA ---
async function createSale(req: VercelRequest, res: VercelResponse) {
  try {
    const saleData: SalesData = req.body;

    // =============================================================
    // SUA LÓGICA COMPLETA PARA INSERIR UMA NOVA VENDA E CLIENTE NO BANCO
    // Isso pode envolver múltiplas queries dentro de uma transação.
    // =============================================================

    console.log('Dados recebidos para criar venda:', saleData);
    // Resposta temporária de sucesso
    return res.status(201).json({ message: 'Venda criada com sucesso!', data: saleData });

  } catch (error: any) {
    console.error('Failed to create sale:', error);
    return res.status(500).json({ error: 'Database query failed', details: error.message });
  }
}

export default withDbConnection(handler as any);
```
