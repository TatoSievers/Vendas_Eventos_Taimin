import React, { useState } from 'react';

interface PasswordScreenProps {
  onCorrectPassword: () => void;
  appPassword: string;
}

const PasswordScreen: React.FC<PasswordScreenProps> = ({ onCorrectPassword, appPassword }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    // Simple delay to give feedback on button press
    setTimeout(() => {
      if (password === appPassword) {
        onCorrectPassword();
      } else {
        setError('Senha incorreta. Por favor, tente novamente.');
        setPassword('');
        const input = document.getElementById('password');
        if (input) {
            input.focus();
        }
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-gray-200">
      <div className="w-full max-w-sm bg-slate-800 p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Acesso Restrito</h1>
        <p className="text-center text-gray-400 mb-6">Por favor, insira a senha para continuar.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
             <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1 sr-only">Senha</label>
             <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                autoFocus
                className="w-full p-3 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 focus:ring-primary focus:border-primary transition duration-150 ease-in-out"
             />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-wait"
          >
            {isSubmitting ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordScreen;
