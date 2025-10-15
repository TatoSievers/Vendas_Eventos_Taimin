// DENTRO DE: api/sales/[id].ts (AGORA O ARQUIVO MESTRE)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';
import { SalesData } from '../../types';

// Suas funções helper permanecem as mesmas
const formatDateToYYYYMMDD = (dateInput: string | Date | null): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatSaleForClient = (sale: any) => {
  return {
    ...sale,
    dataEvento: formatDateToYYYYMMDD(sale.dataEvento),
    valorTotal: parseFloat(sale.valorTotal || 0),
    produtos: (sale.produtos || []).map((p: any) => ({
      ...p,
      preco_unitario: parseFloat(p.preco_unitario || 0)
    })),
  };
};

// ==================================================================
// HANDLER MESTRE QUE DECIDE O QUE FAZER
// ==================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'POST':
        // Se é POST, é sempre para CRIAR uma nova venda.
        return await createSale(req, res);
      
      case 'GET':
        // Se é GET, verificamos se há um ID na URL.
        return await getSaleById(req, res); // A função getSaleById agora precisa lidar com isso.

      case 'PUT':
        // Se é PUT, é para ATUALIZAR uma venda existente.
        return await updateSale(req, res);

      case 'DELETE':
        // Se é DELETE, é para DELETAR uma venda existente.
        return await deleteSale(req, res);
      
      case 'OPTIONS':
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`ERRO CRÍTICO EM /api/sales/[id] PARA O MÉTODO ${req.method}:`, error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}

// ==================================================================
// LÓGICA DAS FUNÇÕES
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


async function getSaleById(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    // Se não houver ID, esta função não deve fazer nada, pois a busca geral é em /api/data
    if (typeof id !== 'string' || !id) {
        return res.status(400).json({ error: 'Um ID de venda é necessário para esta operação.' });
    }
    const saleResult = await query(`
      SELECT 
        s.id, s.created_at, s.forma_pagamento, s.valor_total as "valorTotal", s.observacao,
        u.name as "nomeUsuario", e.name as "nomeEvento", e.date as "dataEvento",
        c.primeiro_nome as "primeiroNome", c.sobrenome, c.cpf, c.email, c.ddd, c.telefone_numero as "telefoneNumero",
        c.logradouro_rua as "logradouroRua", c.numero_endereco as "numeroEndereco", c.complemento, c.bairro, c.cidade, c.estado, c.cep,
        (
          SELECT json_agg(json_build_object('nomeProduto', p.name, 'unidades', sp.unidades, 'preco_unitario', sp.preco_unitario))
          FROM sale_products sp JOIN products p ON sp.product
