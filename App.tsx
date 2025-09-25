// Fix: Add triple-slash directive to include Vite client types and resolve TypeScript error for import.meta.env.
/// <reference types="vite/client" />

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import SalesForm from './components/SalesForm';
import InitialSetupForm from './components/InitialSetupForm';
import Lightbox from './components/Lightbox';
import Header from './components/Header';
import { SalesData, EventDetail, UserDetail, InitialSetupData, LightboxMessage, ProdutoInfo } from './types';
import PasswordScreen from './components/PasswordScreen';
import { PAYMENT_METHODS } from './constants';
import PasswordPrompt from './components/PasswordPrompt';
import DatabaseErrorScreen from './components/DatabaseErrorScreen';

const ManagerialDashboard = lazy(() => import('./components/ManagerialDashboard'));
const SalesList = lazy(() => import('./components/SalesList'));
const ProductManager = lazy(() => import('./components/ProductManager'));

type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [appUsers, setAppUsers] = useState<UserDetail[]>([]);
  const [appEvents, setAppEvents] = useState<EventDetail[]>([]);
  const [appProducts, setAppProducts] = useState<ProdutoInfo[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const [lightboxMessage, setLightboxMessage] = useState<LightboxMessage | null>(null);
  const [isProductManagerOpen, setIsProductManagerOpen] = useState<boolean>(false);
  const [isProductManagerPasswordPromptOpen, setIsProductManagerPasswordPromptOpen] = useState<boolean>(false);
  
  // Use VITE_APP_PASSWORD from .env file for security, with a fallback for convenience.
  // In Vercel, this should be set as an environment variable.
  const appPassword = import.meta.env.VITE_APP_PASSWORD || '12';

  // Fetch initial data from the backend API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/data');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch data');
        }
        const data = await response.json();
        setAppUsers(data.appUsers);
        setAppEvents(data.appEvents);
        setAppProducts(data.appProducts);
        setAllSales(data.allSales);
      } catch (e: any) {
        setDbError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);


  const handleInitialSetupComplete = (setupData: InitialSetupData) => {
    setCurrentUser(setupData.userName);
    setCurrentEventName(setupData.eventName);
    setCurrentEventDate(setupData.eventDate);
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  };

  const handleCreateUser = async (name: string) => {
      if (appUsers.some(u => u.name.trim().toLowerCase() === name.trim().toLowerCase())) return;
      await fetch('/api/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'user', name }),
      });
      setAppUsers(prev => [...prev, { name }].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const handleCreateEvent = async (name: string, date: string) => {
      if (appEvents.some(e => e.name.trim().toLowerCase() === name.trim().toLowerCase())) return;
      await fetch('/api/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'event', name, date }),
      });
      setAppEvents(prev => [...prev, { name, date }].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const handleSaveSale = async (saleData: SalesData, isEditing: boolean) => {
    try {
      const response = await fetch('/api/sales', {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saleData)
      });
      if (!response.ok) throw new Error(await response.text());
      const { sale: savedSale } = await response.json();
      
      if (isEditing) {
          setAllSales(prev => prev.map(s => s.id === savedSale.id ? savedSale : s));
          setLightboxMessage({ type: 'success', text: 'Venda atualizada com sucesso!' });
      } else {
          setAllSales(prev => [savedSale, ...prev]);
          setLightboxMessage({ type: 'success', text: 'Venda registrada com sucesso!' });
      }
    } catch (error: any) {
        setLightboxMessage({ type: 'error', text: 'Ocorreu um erro ao salvar a venda.' });
    }
    setEditingSaleId(null);
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta venda?")) return;
    try {
        const response = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete sale from server.');
        setAllSales(prev => prev.filter(s => s.id !== saleId));
        setLightboxMessage({ type: 'success', text: 'Venda excluída com sucesso.' });
    } catch (error: any) {
        setLightboxMessage({ type: 'error', text: 'Ocorreu um erro ao excluir a venda.' });
    }
  };

  const handleDeleteEvent = async (eventName: string) => {
    const salesCount = allSales.filter(s => s.nomeEvento === eventName).length;
    if (!window.confirm(`Tem certeza que deseja apagar o evento "${eventName}" e todas as suas ${salesCount} vendas associadas? Esta ação é irreversível.`)) return;
    try {
        const response = await fetch(`/api/events/${encodeURIComponent(eventName)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete event from server.');
        
        setAppEvents(prev => prev.filter(e => e.name !== eventName));
        setAllSales(prev => prev.filter(s => s.nomeEvento !== eventName));
        setFilterEvent('');
        setLightboxMessage({ type: 'success', text: `Evento "${eventName}" e todas as suas vendas foram excluídos.` });
    } catch (error: any) {
        setLightboxMessage({ type: 'error', text: 'Ocorreu um erro ao excluir o evento.' });
    }
  };

  const handleSaveProduct = async (product: ProdutoInfo, originalName?: string) => {
    const isEditing = !!originalName;
    const response = await fetch('/api/products', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, originalName })
    });

    if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to save product.');
    }
    
    setAppProducts(prev => {
        const updated = isEditing
            ? prev.map(p => p.name === originalName ? product : p)
            : [...prev, product];
        return updated.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const handleDeleteProduct = async (productName: string) => {
    const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName })
    });
     if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to delete product.');
    }
    setAppProducts(prev => prev.filter(p => p.name !== productName));
  };
  
  const handleSetEditingSale = (saleId: string | null) => {
    if (saleId) {
      const saleToEdit = allSales.find(sale => sale.id === saleId);
      if (saleToEdit) {
        setEditingSaleId(saleId);
        setCurrentUser(saleToEdit.nomeUsuario);
        setCurrentEventName(saleToEdit.nomeEvento);
        setCurrentEventDate(saleToEdit.dataEvento);
        setCurrentView('salesFormAndList');
      }
    } else {
      setEditingSaleId(null);
    }
  };

  const handleCancelEdit = () => setEditingSaleId(null);

  const uniqueEvents = useMemo<EventDetail[]>(() => [...appEvents], [appEvents]);
  const uniqueUsers = useMemo<UserDetail[]>(() => [...appUsers], [appUsers]);

  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? 
        sale.primeiroNome.toLowerCase().includes(searchTermLower) ||
        sale.sobrenome.toLowerCase().includes(searchTermLower) ||
        sale.cpf.includes(searchTermLower) ||
        sale.nomeEvento.toLowerCase().includes(searchTermLower)
        : true;
      const matchesEvent = filterEvent ? sale.nomeEvento === filterEvent : true;
      const matchesUser = filterUser ? sale.nomeUsuario === filterUser : true;
      return matchesSearch && matchesEvent && matchesUser;
    }); // Sorting is now done server-side
  }, [allSales, searchTerm, filterEvent, filterUser]);

  const navigateToDashboard = () => setCurrentView('dashboard');
  const navigateToSalesForm = () => { setEditingSaleId(null); setCurrentView('salesFormAndList'); }
  const navigateToSetup = () => {
    setCurrentUser('');
    setCurrentEventName('');
    setCurrentEventDate('');
    setEditingSaleId(null);
    setCurrentView('setup');
  }
  
  const handleLogoClick = () => {
    if (currentView === 'dashboard') navigateToSalesForm();
    else if (currentView === 'salesFormAndList') navigateToSetup();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('setup');
  };

  const handleProductManagerPasswordSuccess = () => {
    setIsProductManagerPasswordPromptOpen(false);
    setIsProductManagerOpen(true);
  }

  const saleBeingEdited = editingSaleId ? allSales.find(s => s.id === editingSaleId) || null : null;
  
  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
              <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-24 w-auto mb-8" />
              <h1 className="text-2xl font-semibold">Carregando Dados...</h1>
              <p className="text-gray-400">Conectando ao banco de dados.</p>
          </div>
      );
  }

  if (dbError) {
      return <DatabaseErrorScreen error={dbError} />;
  }
  
  if (!appPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
        <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-24 w-auto mb-8" />
        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl">
          <h1 className="text-2xl text-red-400 font-bold">Erro de Configuração</h1>
          <p className="text-lg text-gray-300 mt-2">A senha de acesso (VITE_APP_PASSWORD) não foi configurada.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordScreen onCorrectPassword={() => setIsAuthenticated(true)} appPassword={appPassword} />;
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-gray-200">
      {isProductManagerPasswordPromptOpen && (
        <PasswordPrompt 
          onClose={() => setIsProductManagerPasswordPromptOpen(false)}
          onSuccess={handleProductManagerPasswordSuccess}
          appPassword={appPassword}
        />
      )}
      {isProductManagerOpen && (
        <Suspense fallback={<div>Carregando...</div>}>
          <ProductManager
            products={appProducts}
            onSave={handleSaveProduct}
            onDelete={handleDeleteProduct}
            onClose={() => setIsProductManagerOpen(false)}
            onNotify={setLightboxMessage}
          />
        </Suspense>
      )}
      {currentView === 'setup' ? (
        <main className="w-full flex-grow flex flex-col items-center justify-center text-center">
          <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-24 w-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-8">Vendas Taimin</h1>
          <InitialSetupForm 
            onSetupComplete={handleInitialSetupComplete} 
            uniqueEvents={uniqueEvents} 
            uniqueUsers={uniqueUsers}
            onCreateUser={handleCreateUser}
            onCreateEvent={handleCreateEvent}
            onOpenProductManager={() => setIsProductManagerPasswordPromptOpen(true)}
          />
        </main>
      ) : (
        <>
          <Header
            currentUser={currentUser}
            currentEventName={currentEventName}
            showUserInfo={true}
            onLogoClick={handleLogoClick}
            onLogout={handleLogout}
          />
          <main className="w-full flex flex-col items-center space-y-8 md:space-y-12">
            {currentView === 'salesFormAndList' && (
              <>
                <SalesForm 
                  onSaveSale={handleSaveSale} 
                  editingSale={saleBeingEdited} 
                  onCancelEdit={handleCancelEdit} 
                  paymentMethods={PAYMENT_METHODS}
                  appProducts={appProducts}
                  currentUser={currentUser} 
                  currentEventName={currentEventName} 
                  currentEventDate={currentEventDate} 
                  onGoBackToSetup={navigateToSetup} 
                  onNotify={setLightboxMessage} 
                />
                <Suspense fallback={
                  <div className="w-full max-w-4xl bg-slate-800 p-8 rounded-xl shadow-2xl text-center">
                    <h2 className="text-2xl font-semibold text-white">Carregando Vendas...</h2>
                  </div>
                }>
                  <SalesList 
                    sales={filteredSales}
                    allSalesForFilters={allSales}
                    onNavigateToDashboard={navigateToDashboard} 
                    onEditSale={handleSetEditingSale} 
                    onDeleteSale={handleDeleteSale}
                    onNotify={setLightboxMessage}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterEvent={filterEvent}
                    setFilterEvent={setFilterEvent}
                    filterUser={filterUser}
                    setFilterUser={setFilterUser}
                    onDeleteEvent={handleDeleteEvent}
                  />
                </Suspense>
              </>
            )}
            {currentView === 'dashboard' && (
              <Suspense fallback={
                <div className="w-full text-center p-10">
                  <h2 className="text-2xl font-semibold text-white">Carregando Relatório...</h2>
                </div>
              }>
                <ManagerialDashboard 
                  allSales={allSales} 
                  initialFilterEvent={filterEvent} 
                  initialFilterUser={filterUser}
                  uniqueEvents={uniqueEvents}
                  uniqueUsers={uniqueUsers}
                  onGoBack={navigateToSalesForm} 
                />
              </Suspense>
            )}
          </main>
        </>
      )}

      {lightboxMessage && <Lightbox message={lightboxMessage} onClose={() => setLightboxMessage(null)} />}
      <footer className="w-full text-center py-8 mt-auto">
        <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Vendas Taimin.</p>
      </footer>
    </div>
  );
};

export default App;
