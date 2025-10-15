// DENTRO DE: api/sales/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';
import { SalesData } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // O navegador pode enviar uma requisição 'OPTIONS' antes de um POST
  // para verificar permissões. Precisamos responder com sucesso a ela.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Apenas o método POST é permitido para esta rota.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Se o método for POST, executa a lógica de criação da venda.
  try {
    const saleData: SalesData = req.body;

    // Passo 1: Criar ou atualizar o cliente e obter o ID
    const customerResult = await query(
      `INSERT INTO customers (cpf, primeiro_nome, sobrenome, email, ddd, telefone_numero, cep, logradouro_rua, numero_endereco, complemento, bairro, cidade, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (cpf) DO UPDATE SET primeiro_nome = EXCLUDED.primeiro_nome, sobrenome = EXCLUDED.sobrenome, email = EXCLUDED.email, ddd = EXCLUDED.ddd, telefone_numero = EXCLUDED.telefone_numero, cep = EXCLUDED.cep, logradouro_rua = EXCLUDED.logradouro_rua, numero_endereco = EXCLUDED.numero_endereco, complemento = EXCLUDED.complemento, bairro = EXCLUDED.bairro, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado
       RETURNING id`,
      [saleData.cpf, saleData.primeiroNome, saleData.sobrenome, saleData.email, saleData.ddd, saleData.telefoneNumero, saleData.cep, saleData.logradouroRua, saleData.numeroEndereco, saleData.complemento, saleData.bairro, saleData.cidade, saleData.estado]
    );
    const customerId = customerResult[0].id;

    // Passo 2: Obter IDs do usuário e do evento
    const userResult = await query('SELECT id FROM users WHERE name = $1', [saleData.nomeUsuario]);
    const eventResult = await query('SELECT id FROM events WHERE name = $1', [saleData.nomeEvento]);
    if (!userResult[0] || !eventResult[0]) {
      throw new Error('Usuário ou Evento não encontrado no banco de dados.');
    }
    const userId = userResult[0].id;
    const eventId = eventResult[0].id;

    // Passo 3: Inserir a venda
    const saleResult = await query(
      `INSERT INTO sales (user_id, event_id, customer_id, forma_pagamento, valor_total, observacao)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [userId, eventId, customerId, saleData.formaPagamento, saleData.valorTotal, saleData.observacao]
    );
    const { id: saleId, created_at: createdAt } = saleResult[0];

    // Passo 4: Inserir os produtos da venda
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

    // Passo 5: Retornar a venda completa para o frontend
    const newCompleteSale = { ...saleData, id: saleId, created_at: createdAt };
    return res.status(201).json({ sale: newCompleteSale });

  } catch (error: any) {
    console.error('ERRO CRÍTICO NO POST /api/sales:', error);
    return res.status(500).json({ error: 'Erro interno ao criar a venda.', details: error.message });
  }
}
