// DENTRO DE: api/sales/[id].ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db.js';
import { SalesData } from '../../types';

// Suas funções helper originais
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

// Handler principal simplificado
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getSaleById(req, res);
      case 'PUT':
        return await updateSale(req, res);
      case 'DELETE':
        return await deleteSale(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`ERRO CRÍTICO EM /api/sales/[id] PARA O MÉTODO ${req.method}:`, error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}

// ==================================================================
// SUAS FUNÇÕES ORIGINAIS (AGORA PREENCHIDAS CORRETAMENTE)
// ==================================================================

async function getSaleById(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Sale ID is required.' });
  }
  const saleResult = await query(`
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
    JOIN users u ON s.user_id = u.id
    JOIN events e ON s.event_id = e.id
    JOIN customers c ON s.customer_id = c.id
    WHERE s.id = $1
  `, [id]);
  if (saleResult.length === 0) {
    return res.status(404).json({ error: 'Sale not found.' });
  }
  const formattedSale = formatSaleForClient(saleResult[0]);
  return res.status(200).json(formattedSale);
}

async function updateSale(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Sale ID is required.' });
  }
  const saleData: SalesData = req.body;
  
  const saleCheck = await query('SELECT customer_id FROM sales WHERE id = $1', [id]);
  const customerId = saleCheck[0]?.customer_id;
  if (!customerId) {
    return res.status(404).json({ error: 'Sale to update not found.' });
  }
  
  await query(`
    UPDATE customers SET 
      primeiro_nome = $1, sobrenome = $2, email = $3, ddd = $4, telefone_numero = $5, 
      cep = $6, logradouro_rua = $7, numero_endereco = $8, complemento = $9, 
      bairro = $10, cidade = $11, estado = $12
    WHERE id = $13;
  `, [
    saleData.primeiroNome, saleData.sobrenome, saleData.email, saleData.ddd, saleData.telefoneNumero,
    saleData.cep, saleData.logradouroRua, saleData.numeroEndereco, saleData.complemento,
    saleData.bairro, saleData.cidade, saleData.estado, customerId
  ]);
  
  await query(`
    UPDATE sales SET forma_pagamento = $1, valor_total = $2, observacao = $3
    WHERE id = $4;
  `, [saleData.formaPagamento, saleData.valorTotal, saleData.observacao, id]);

  await query('DELETE FROM sale_products WHERE sale_id = $1', [id]);
  
  if (saleData.produtos && saleData.produtos.length > 0) {
    const productNames = saleData.produtos.map(p => p.nomeProduto);
    const productIdsResult = await query(`SELECT id, name FROM products WHERE name = ANY($1::text[])`, [productNames]);
    const productIdMap = new Map(productIdsResult.map((p: any) => [p.name, p.id]));
    for (const product of saleData.produtos) {
      const productId = productIdMap.get(product.nomeProduto);
      if (!productId) throw new Error(`Product '${product.nomeProduto}' not found.`);
      await query(`
        INSERT INTO sale_products (sale_id, product_id, unidades, preco_unitario)
        VALUES ($1, $2, $3, $4);
      `, [id, productId, product.unidades, product.preco_unitario]);
    }
  }
  
  const updatedSaleResult = await query(`
    SELECT s.id FROM sales s WHERE s.id = $1
  `, [id]);
  
  return res.status(200).json({ sale: updatedSaleResult[0] });
}

async function deleteSale(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Sale ID is required.' });
  }
  await query('DELETE FROM sales WHERE id = $1', [id]);
  return res.status(200).json({ message: 'Sale deleted successfully.' });
}
