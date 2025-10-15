// DENTRO DE: api/sales/[id].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';
import { SalesData } from '../../types';

// ==================================================================
// HANDLER MESTRE
// ==================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;

    switch (req.method) {
      case 'POST':
        // POST é sempre para criar uma nova venda. O ID não é usado na URL.
        return await createSale(req, res);
      
      case 'GET':
        // A busca geral de todas as vendas agora é em /api/data.
        // Este endpoint só deve buscar por um ID específico.
        if (typeof id !== 'string' || !id) {
          return res.status(400).json({ error: 'Um ID de venda é necessário para GET.' });
        }
        return await getSaleById(id, res);

      case 'PUT':
        if (typeof id !== 'string' || !id) {
          return res.status(400).json({ error: 'Um ID de venda é necessário para PUT.' });
        }
        return await updateSale(id, req, res);

      case 'DELETE':
        if (typeof id !== 'string' || !id) {
          return res.status(400).json({ error: 'Um ID de venda é necessário para DELETE.' });
        }
        return await deleteSale(id, res);
      
      case 'OPTIONS':
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`ERRO CRÍTICO EM /api/sales/[id] | MÉTODO: ${req.method} | ERRO:`, error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}

// ==================================================================
// FUNÇÕES DE LÓGICA
// ==================================================================

async function createSale(req: VercelRequest, res: VercelResponse) {
  const saleData: SalesData = req.body;
  
  const customerResult = await query(
    `INSERT INTO customers (cpf, primeiro_nome, sobrenome, email, ddd, telefone_numero, cep, logradouro_rua, numero_endereco, complemento, bairro, cidade, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (cpf) DO UPDATE SET primeiro_nome = EXCLUDED.primeiro_nome, sobrenome = EXCLUDED.sobrenome, email = EXCLUDED.email, ddd = EXCLUDED.ddd, telefone_numero = EXCLUDED.telefone_numero, cep = EXCLUDED.cep, logradouro_rua = EXCLUDED.logradouro_rua, numero_endereco = EXCLUDED.numero_endereco, complemento = EXCLUDED.complemento, bairro = EXCLUDED.bairro, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado
     RETURNING id`,
    [saleData.cpf, saleData.primeiroNome, saleData.sobrenome, saleData.email, saleData.ddd, saleData.telefoneNumero, saleData.cep, saleData.logradouroRua, saleData.numeroEndereco, saleData.complemento, saleData.bairro, saleData.cidade, saleData.estado]
  );
  const customerId = customerResult[0].id;

  const userResult = await query('SELECT id FROM users WHERE name = $1', [saleData.nomeUsuario]);
  const eventResult = await query('SELECT id FROM events WHERE name = $1', [saleData.nomeEvento]);
  if (!userResult[0] || !eventResult[0]) {
    throw new Error('Usuário ou Evento não encontrado no banco de dados.');
  }
  const userId = userResult[0].id;
  const eventId = eventResult[0].id;

  const saleResult = await query(
    `INSERT INTO sales (user_id, event_id, customer_id, forma_pagamento, valor_total, observacao)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
    [userId, eventId, customerId, saleData.formaPagamento, saleData.valorTotal, saleData.observacao]
  );
  const { id: saleId, created_at: createdAt } = saleResult[0];

  if (saleData.produtos && saleData.produtos.length > 0) {
    const productNames = saleData.produtos.map(p => p.nomeProduto);
    const productIdsResult = await query(`SELECT id, name FROM products WHERE name = ANY($1::text[])`, [productNames]);
    const productIdMap = new Map(productIdsResult.map((p: any) => [p.name, p.id]));
    for (const product of saleData.produtos) {
      const productId = productIdMap.get(product.nomeProduto);
      if (!productId) throw new Error(`Produto '${product.nomeProduto}' não encontrado.`);
      await query(
        `INSERT INTO sale_products (sale_id, product_id, unidades, preco_unitario) VALUES ($1, $2, $3, $4)`,
        [saleId, productId, product.unidades, product.preco_unitario]
      );
    }
  }
  const newCompleteSale = { ...saleData, id: saleId, created_at: createdAt };
  return res.status(201).json({ sale: newCompleteSale });
}

async function getSaleById(id: string, res: VercelResponse) {
    const saleResult = await query(`SELECT * FROM sales WHERE id = $1`, [id]);
    if (saleResult.length === 0) {
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }
    return res.status(200).json(saleResult[0]);
}

async function updateSale(id: string, req: VercelRequest, res: VercelResponse) {
    const saleData: SalesData = req.body;
    // ... Implemente sua lógica de atualização aqui ...
    return res.status(200).json({ message: "Venda atualizada com sucesso" });
}

async function deleteSale(id: string, res: VercelResponse) {
    await query('DELETE FROM sales WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Venda deletada com sucesso.' });
}
