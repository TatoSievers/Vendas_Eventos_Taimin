

import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from './icons';

interface LightboxProps {
  message: {
    type: 'success' | 'error' | 'info';
    text: string;
  };
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ message, onClose }) => {
  const Icon = {
    success: CheckCircleIcon,
    error: ExclamationTriangleIcon,
    info: ExclamationTriangleIcon,
  }[message.type];

  const colors = {
    success: {
      bg: 'bg-green-100',
      icon: 'text-green-500',
      border: 'border-green-400',
    },
    error: {
      bg: 'bg-red-100',
      icon: 'text-red-500',
      border: 'border-red-400',
    },
    info: {
      bg: 'bg-blue-100',
      icon: 'text-blue-500',
      border: 'border-blue-400',
    }
  };
  
  const selectedColor = colors[message.type] || colors.info;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={`relative w-full max-w-md m-auto bg-slate-800 rounded-lg shadow-2xl p-6 border-t-4 ${selectedColor.border} transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale`}
        onClick={handleOverlayClick}
      >
        <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 h-10 w-10 rounded-full ${selectedColor.bg} flex items-center justify-center`}>
                <Icon className={`h-6 w-6 ${selectedColor.icon}`} aria-hidden="true" />
            </div>
            <div className="flex-1">
                <p className="text-lg font-medium text-gray-100">
                    {message.text}
                </p>
            </div>
            <button 
                onClick={onClose} 
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Fechar notificação"
            >
                <XMarkIcon className="h-6 w-6" />
            </button>
        </div>
        <div className="mt-5 sm:mt-6 text-center">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary hover:bg-primary-dark text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-light sm:text-sm"
              onClick={onClose}
            >
              OK
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Lightbox;