import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import SalesForm from './components/SalesForm';
import InitialSetupForm from './components/InitialSetupForm';
import Lightbox from './components/Lightbox';
import Header from './components/Header';
import { SalesData, EventDetail, UserDetail, InitialSetupData, PaymentMethodDetail, LightboxMessage } from './types';
import PasswordScreen from './components/PasswordScreen';

const ManagerialDashboard = lazy(() => import('./components/ManagerialDashboard'));
const SalesList = lazy(() => import('./components/SalesList'));


// --- Funções Auxiliares para Armazenamento Local ---
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error(`Error parsing localStorage key "${key}":`, e);
            return defaultValue;
        }
    }
    return defaultValue;
};

type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [allSales, setAllSales] = useState<SalesData[]>(() => loadFromLocalStorage('salesData', []));
  const [appUsers, setAppUsers] = useState<UserDetail[]>(() => loadFromLocalStorage('appUsers', []));
  const [appEvents, setAppEvents] = useState<EventDetail[]>(() => loadFromLocalStorage('appEvents', []));
  const [appPaymentMethods, setAppPaymentMethods] = useState<PaymentMethodDetail[]>(() => loadFromLocalStorage('appPaymentMethods', []));

  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const [lightboxMessage, setLightboxMessage] = useState<LightboxMessage | null>(null);
  
  // Hardcoded password to ensure the app runs in any environment without a build step.
  const appPassword = '12';

  // Persist state to localStorage on change
  useEffect(() => { localStorage.setItem('salesData', JSON.stringify(allSales)); }, [allSales]);
  useEffect(() => { localStorage.setItem('appUsers', JSON.stringify(appUsers)); }, [appUsers]);
  useEffect(() => { localStorage.setItem('appEvents', JSON.stringify(appEvents)); }, [appEvents]);
  useEffect(() => { localStorage.setItem('appPaymentMethods', JSON.stringify(appPaymentMethods)); }, [appPaymentMethods]);


  const handleInitialSetupComplete = (setupData: InitialSetupData) => {
    setCurrentUser(setupData.userName);
    setCurrentEventName(setupData.eventName);
    setCurrentEventDate(setupData.eventDate);
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  };

  const handleCreateUser = async (name: string) => {
      if (appUsers.some(u => u.name.trim().toLowerCase() === name.trim().toLowerCase())) return; // Ignore duplicates
      setAppUsers(prev => [...prev, { name }]);
  };

  const handleCreateEvent = async (name: string, date: string) => {
      if (appEvents.some(e => e.name.trim().toLowerCase() === name.trim().toLowerCase())) return; // Ignore duplicates
      setAppEvents(prev => [...prev, { name, date }]);
  };

  const handleCreatePaymentMethod = async (name: string) => {
      if (appPaymentMethods.some(pm => pm.name.trim().toLowerCase() === name.trim().toLowerCase())) return; // Ignore duplicates
      setAppPaymentMethods(prev => [...prev, { name }]);
  };

  const handleSaveSale = async (saleData: SalesData, isEditing: boolean) => {
      try {
          if (isEditing && editingSaleId) {
              const originalSale = allSales.find(s => s.id === editingSaleId);
              const updatedSale: SalesData = {
                  ...saleData,
                  id: editingSaleId,
                  created_at: originalSale?.created_at || new Date().toISOString(), // Preserve original creation date
              };
              setAllSales(prev => prev.map(s => s.id === editingSaleId ? updatedSale : s));
              setLightboxMessage({ type: 'success', text: 'Venda atualizada com sucesso!' });
          } else {
              const newSale: SalesData = {
                  ...saleData,
                  id: crypto.randomUUID(),
                  created_at: new Date().toISOString(),
              };
              setAllSales(prev => [newSale, ...prev]);
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
        setAppEvents(prev => prev.filter(e => e.name !== eventName));
        setAllSales(prev => prev.filter(s => s.nomeEvento !== eventName));
        setFilterEvent('');
        setLightboxMessage({ type: 'success', text: `Evento "${eventName}" e todas as suas vendas foram excluídos.` });
    } catch (error: any) {
        setLightboxMessage({ type: 'error', text: 'Ocorreu um erro ao excluir o evento.' });
    }
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

  const uniqueEvents = useMemo<EventDetail[]>(() => {
    return [...appEvents].sort((a,b) => a.name.localeCompare(b.name));
  }, [appEvents]);

  const uniqueUsers = useMemo<UserDetail[]>(() => {
    return [...appUsers].sort((a, b) => a.name.localeCompare(b.name));
  }, [appUsers]);

  const uniquePaymentMethods = useMemo<PaymentMethodDetail[]>(() => {
    return [...appPaymentMethods].sort((a, b) => a.name.localeCompare(b.name));
  }, [appPaymentMethods]);
  
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
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  const saleBeingEdited = editingSaleId ? allSales.find(s => s.id === editingSaleId) || null : null;
  
  if (!appPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
        <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-24 w-auto mb-8" />
        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl">
          <h1 className="text-2xl text-red-400 font-bold">Erro de Configuração</h1>
          <p className="text-lg text-gray-300 mt-2">A senha de acesso não foi configurada.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordScreen onCorrectPassword={() => setIsAuthenticated(true)} appPassword={appPassword} />;
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-gray-200">
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
                  uniquePaymentMethods={uniquePaymentMethods} 
                  allSales={allSales} 
                  currentUser={currentUser} 
                  currentEventName={currentEventName} 
                  currentEventDate={currentEventDate} 
                  onGoBackToSetup={navigateToSetup} 
                  onNotify={setLightboxMessage} 
                  onCreatePaymentMethod={handleCreatePaymentMethod}
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