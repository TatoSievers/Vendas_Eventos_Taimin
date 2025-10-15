// Dentro de api/sales/index.js

export default async function handler(req, res) {
  // Pega o método que o frontend enviou (GET, POST, etc.)
  const { method } = req;

  // Se o método for GET, significa que o frontend quer a LISTA de todas as vendas.
  if (method === 'GET') {
    try {
      // =============================================================
      // COLOQUE AQUI A SUA LÓGICA PARA BUSCAR TODAS AS VENDAS NO BANCO DE DADOS
      // Exemplo:
      // const vendas = await seuBancoDeDados.query('SELECT * FROM sales');
      // res.status(200).json(vendas);
      // =============================================================

      // Resposta temporária enquanto você adiciona a lógica:
      return res.status(200).json({ message: 'Lógica para LISTAR todas as vendas vai aqui.' });

    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar vendas.' });
    }
  }

  // Se o método for POST, significa que o frontend quer CRIAR uma nova venda.
  if (method === 'POST') {
    try {
      const dadosDaVenda = req.body; // Pega os dados enviados pelo frontend

      // ==============================================================
      // COLOQUE AQUI A SUA LÓGICA PARA SALVAR A NOVA VENDA NO BANCO DE DADOS
      // Exemplo:
      // const novaVenda = await seuBancoDeDados.query('INSERT INTO sales (...) VALUES (...)', [dadosDaVenda.valor, ...]);
      // res.status(201).json(novaVenda);
      // ===============================================================

      // Resposta temporária enquanto você adiciona a lógica:
      return res.status(201).json({ message: 'Lógica para CRIAR uma nova venda vai aqui.' });

    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar a venda.' });
    }
  }

  // Se o método não for nem GET nem POST, o servidor avisa que não é permitido.
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
