import React from 'react';

interface DatabaseErrorScreenProps {
  error: string;
}

const DatabaseErrorScreen: React.FC<DatabaseErrorScreenProps> = ({ error }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
      <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-24 w-auto mb-8" />
      <div className="bg-slate-800 p-8 rounded-lg shadow-2xl max-w-lg">
        <h1 className="text-2xl text-red-400 font-bold">Erro Crítico de Conexão</h1>
        <p className="text-lg text-gray-300 mt-4">
          Não foi possível conectar ao banco de dados para carregar as informações da aplicação.
        </p>
        <p className="text-sm text-gray-500 mt-2">
            Por favor, verifique a configuração do banco de dados e a variável de ambiente `DATABASE_URL` no seu provedor de hospedagem (Vercel).
        </p>
        <div className="mt-6 p-3 bg-slate-700/50 rounded text-left text-xs text-red-300 font-mono">
            <p><strong>Detalhe do Erro:</strong></p>
            <p>{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-md shadow-md"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
};

export default DatabaseErrorScreen;
