import { VercelRequest, VercelResponse } from '@vercel/node';
// Fix: Corrected relative path to the db module.
import { withDbConnection, query } from '../lib/db.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { cpf } = req.query;

  if (typeof cpf !== 'string' || !cpf) {
    return res.status(400).json({ error: 'CPF is required' });
  }

  try {
    const result = await query(`
        SELECT 
            primeiro_nome as "primeiroNome",
            sobrenome,
            email,
            ddd,
            telefone_numero as "telefoneNumero",
            logradouro_rua as "logradouroRua",
            numero_endereco as "numeroEndereco",
            complemento,
            bairro,
            cidade,
            estado,
            cep
        FROM customers 
        WHERE cpf = $1
    `, [cpf]);

    if (result.length > 0) {
      return res.status(200).json(result[0]);
    } else {
      return res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error: any) {
    console.error(`Failed to fetch customer with CPF ${cpf}:`, error);
    return res.status(500).json({ error: 'Database query failed', details: error.message });
  }
};

export default withDbConnection(handler as any);