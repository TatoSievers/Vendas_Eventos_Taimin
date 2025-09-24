
import React from 'react';
import { UserIcon, TagIcon, ArrowUturnLeftIcon } from './icons';

interface HeaderProps {
  currentUser?: string;
  currentEventName?: string;
  showUserInfo: boolean;
  onLogoClick: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, currentEventName, showUserInfo, onLogoClick, onLogout }) => {
  return (
    <header className="my-6 md:my-8 w-full flex flex-col items-center gap-4 text-center">
      <div className="w-full max-w-6xl flex justify-between items-center px-4">
        <button
          onClick={onLogoClick}
          title="Voltar"
          className="transition-transform hover:scale-105"
        >
          <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-20 w-auto" />
        </button>

        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight hidden md:block">Vendas Taimin</h1>

        <button
          onClick={onLogout}
          className="flex items-center text-sm bg-slate-700 hover:bg-slate-600 text-gray-300 font-semibold py-2 px-4 rounded-md shadow-md transition-colors"
        >
          <ArrowUturnLeftIcon className="h-5 w-5 mr-2 rotate-90" />
          Sair
        </button>
      </div>
      {showUserInfo && (currentUser || currentEventName) && (
        <div className="w-full max-w-3xl mt-4 p-4 bg-slate-700/50 rounded-md text-sm flex flex-col md:flex-row justify-center items-center gap-x-6 gap-y-2">
          {currentUser && <p className="flex items-center"><UserIcon className="h-4 w-4 mr-2 text-primary-light" /> <strong className="font-medium text-gray-300 mr-1">Usuário:</strong> {currentUser}</p>}
          {currentEventName && <p className="flex items-center"><TagIcon className="h-4 w-4 mr-2 text-primary-light" /> <strong className="font-medium text-gray-300 mr-1">Evento:</strong> {currentEventName}</p>}
        </div>
      )}
    </header>
  );
};

export default Header;
