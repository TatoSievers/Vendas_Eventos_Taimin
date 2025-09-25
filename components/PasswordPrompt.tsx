import React, { useState, useEffect } from 'react';
import { XMarkIcon } from './icons';

interface PasswordPromptProps {
  onClose: () => void;
  onSuccess: () => void;
  appPassword: string;
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({ onClose, onSuccess, appPassword }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const input = document.getElementById('prompt_password');
    if (input) input.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    setTimeout(() => {
      if (password === appPassword) {
        onSuccess();
      } else {
        setError('Senha incorreta.');
        setPassword('');
        const input = document.getElementById('prompt_password');
        if (input) input.focus();
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-prompt-title"
    >
      <div className="w-full max-w-sm bg-slate-800 rounded-xl shadow-2xl p-6 md:p-8 transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="password-prompt-title" className="text-xl font-bold text-white">Acesso Restrito</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-6">É necessária a senha de administrador para gerenciar os produtos.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
             <label htmlFor="prompt_password" className="block text-sm font-medium text-gray-300 mb-1 sr-only">Senha</label>
             <input
                type="password"
                id="prompt_password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                className="w-full p-3 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 focus:ring-primary focus:border-primary"
             />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Verificando...' : 'Confirmar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordPrompt;
