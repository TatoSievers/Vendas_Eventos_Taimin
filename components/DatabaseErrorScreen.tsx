import React, { useState } from 'react';
import { ExclamationTriangleIcon } from './icons';

interface DatabaseErrorScreenProps {
  onRetry: () => void;
}

const sqlSchema = `
-- Habilita a extensão para UUIDs, caso ainda não esteja habilitada.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela para armazenar usuários (vendedores)
CREATE TABLE IF NOT EXISTS app_users (
    name TEXT PRIMARY KEY
);

-- Tabela para armazenar eventos
CREATE TABLE IF NOT EXISTS app_events (
    name TEXT PRIMARY KEY,
    date DATE NOT NULL
);

-- Tabela para armazenar formas de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
    name TEXT PRIMARY KEY
);

-- Tabela principal de vendas
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nomeusuario TEXT NOT NULL,
    nomeevento TEXT NOT NULL,
    dataevento DATE NOT NULL,
    primeironome TEXT NOT NULL,
    sobrenome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT NOT NULL,
    ddd VARCHAR(2) NOT NULL,
    telefonenumero TEXT NOT NULL,
    logradourorua TEXT NOT NULL,
    numeroendereco TEXT NOT NULL,
    complemento TEXT,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT NOT NULL,
    formapagamento TEXT NOT NULL,
    observacao TEXT
);

-- Tabela para ligar produtos a uma venda (relação muitos-para-muitos)
CREATE TABLE IF NOT EXISTS sale_products (
    id SERIAL PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    nome_produto TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10, 2)
);

-- Índices para melhorar a performance de buscas comuns
CREATE INDEX IF NOT EXISTS idx_sales_cpf ON sales(cpf);
CREATE INDEX IF NOT EXISTS idx_sales_nomeevento ON sales(nomeevento);
CREATE INDEX IF NOT EXISTS idx_sale_products_sale_id ON sale_products(sale_id);
`;

const DatabaseErrorScreen: React.FC<DatabaseErrorScreenProps> = ({ onRetry }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSchema.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
      <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-24 w-auto mb-8" />
      <div className="bg-slate-800 p-8 rounded-lg shadow-2xl max-w-3xl w-full">
        <div className="flex items-center justify-center text-red-400 mb-4">
          <ExclamationTriangleIcon className="h-10 w-10 mr-3"/>
          <h1 className="text-2xl font-bold">Erro de Conexão com o Banco de Dados</h1>
        </div>
        <p className="text-lg text-gray-300 mt-2 mb-6">
          O aplicativo não conseguiu encontrar as tabelas necessárias no banco de dados. Isso geralmente acontece na primeira vez que o aplicativo é configurado.
        </p>
        <p className="text-gray-400 mb-4">
          Para corrigir, execute o script SQL abaixo no seu banco de dados Postgres para criar todas as tabelas e estruturas necessárias.
        </p>
        <div className="bg-slate-900 rounded-md p-4 text-left relative">
            <pre className="text-sm text-gray-300 overflow-x-auto">
                <code>
                    {sqlSchema.trim()}
                </code>
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1 px-3 rounded-md text-xs"
            >
                {copied ? 'Copiado!' : 'Copiar SQL'}
            </button>
        </div>

        <p className="text-gray-400 mt-6 mb-4">
          Após executar o script, clique no botão abaixo para tentar novamente.
        </p>

        <button
          onClick={onRetry}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50 transition duration-150 ease-in-out"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
};

export default DatabaseErrorScreen;
