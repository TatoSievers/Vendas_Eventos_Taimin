import React, { useState, useEffect, useMemo } from 'react';
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import InitialSetupForm from './components/InitialSetupForm';
import ManagerialDashboard from './components/ManagerialDashboard';
import Lightbox from './components/Lightbox';
import Header from './components/Header';
import { SalesData, EventDetail, UserDetail, InitialSetupData, PaymentMethodDetail, LightboxMessage } from './types';
import PasswordScreen from './components/PasswordScreen';

// --- Funções Auxiliares para Mapeamento de Dados ---
const fromDatabaseRecord = (dbRecord: { [key: string]: any }): any => {
    const keyMap: { [key: string]: string } = {
        'id': 'id',
        'created_at': 'created_at',
        'nomeusuario': 'nomeUsuario',
        'nomeevento': 'nomeEvento',
        'dataevento': 'dataEvento',
        'primeironome': 'primeiroNome',
        'sobrenome': 'sobrenome',
        'cpf': 'cpf',
        'email': 'email',
        'ddd': 'ddd',
        'telefonenumero': 'telefoneNumero',
        'logradourorua': 'logradouroRua',
        'numeroendereco': 'numeroEndereco',
        'complemento': 'complemento',
        'bairro': 'bairro',
        'cidade': 'cidade',
        'estado': 'estado',
        'cep': 'cep',
        'formapagamento': 'formaPagamento',
        'observacao': 'observacao'
    };
    const appRecord: { [key: string]: any } = {};
    for (const dbKey in dbRecord) {
        const appKey = keyMap[dbKey] || dbKey;
        appRecord[appKey] = dbRecord[dbKey];
    }
    return appRecord;
};

const toDatabaseRecord = (appRecord: { [key: string]: any }): any => {
    const keyMap: { [key: string]: string } = {
        'nomeUsuario': 'nomeusuario',
        'nomeEvento': 'nomeevento',
        'dataEvento': 'dataevento',
        'primeiroNome': 'primeironome',
        'sobrenome': 'sobrenome',
        'cpf': 'cpf',
        'email': 'email',
        'ddd': 'ddd',
        'telefoneNumero': 'telefonenumero',
        'logradouroRua': 'logradourorua',
        'numeroEndereco': 'numeroendereco',
        'complemento': 'complemento',
        'bairro': 'bairro',
        'cidade': 'cidade',
        'estado': 'estado',
        'cep': 'cep',
        'formaPagamento': 'formapagamento',
        'observacao': 'observacao'
    };
    const dbRecord: { [key: string]: any } = {};
    for (const appKey in appRecord) {
        const dbKey = keyMap[appKey];
        if (dbKey) {
            dbRecord[dbKey] = appRecord[appKey];
        }
    }
    return dbRecord;
};


type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('setup');
  
  const [appUsers, setAppUsers] = useState<UserDetail[]>([]);
  const [appEvents, setAppEvents] = useState<EventDetail[]>([]);
  const [appPaymentMethods, setAppPaymentMethods] = useState<PaymentMethodDetail[]>([]);

  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const [lightboxMessage, setLightboxMessage] = useState<LightboxMessage | null>(null);
  
  const appPassword = (import.meta as any).env.VITE_APP_PASSWORD;

  const handleApiError = async (response: Response, action: string): Promise<string> => {
      let errorMessage = `Erro ao ${action}.`;
      try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Erro ${response.status} ao ${action}.`;
      } catch (e) {
          errorMessage = `Erro de comunicação com o servidor ao ${action}.`;
      }
      console.error(errorMessage);
      return errorMessage;
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchInitialData = async () => {
      setIsDataLoaded(false);
      try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error(await handleApiError(response, 'carregar dados'));

        const { sales, users, events, paymentMethods } = await response.json();
        
        const formattedSales = sales.map((dbSale: any) => fromDatabaseRecord(dbSale)) as SalesData[];
        setAllSales(formattedSales);
        setAppUsers(users || []);
        setAppEvents(events || []);
        setAppPaymentMethods(paymentMethods || []);

      } catch (error: any) {
        setLightboxMessage({ type: 'error', text: error.message || "Ocorreu um erro inesperado ao carregar os dados." });
        setAllSales([]);
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchInitialData();
  }, [isAuthenticated]);

  const handleInitialSetupComplete = (setupData: InitialSetupData) => {
    setCurrentUser(setupData.userName);
    setCurrentEventName(setupData.eventName);
    setCurrentEventDate(setupData.eventDate);
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  };

  const createSetupItem = async (type: 'user' | 'event' | 'paymentMethod', payload: any) => {
      try {
          const response = await fetch('/api/setup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, payload }),
          });
          if (!response.ok) {
              const errorText = await handleApiError(response, `criar ${type}`);
              // Ignore duplicate errors silently
              if (!errorText.toLowerCase().includes('duplicate')) {
                 throw new Error(errorText);
              }
              return null; // Return null on handled duplicate
          }
          return await response.json();
      } catch (error: any) {
          // Rethrow to be caught by the calling function
          throw error;
      }
  };
  
  const handleCreateUser = async (name: string) => {
      const data = await createSetupItem('user', { name });
      if (data) setAppUsers(prev => [...prev, data]);
  };

  const handleCreateEvent = async (name: string, date: string) => {
      const data = await createSetupItem('event', { name, date });
      if (data) setAppEvents(prev => [...prev, data]);
  };

  const handleCreatePaymentMethod = async (name: string) => {
      const data = await createSetupItem('paymentMethod', { name });
      if (data) setAppPaymentMethods(prev => [...prev, data]);
  };

  const handleSaveSale = async (saleData: SalesData, isEditing: boolean) => {
      const { id, created_at, produtos, ...salePayload } = saleData;
      const recordToSubmit = toDatabaseRecord(salePayload);

      const body = {
          saleData: recordToSubmit,
          products: produtos.map(p => ({ nome_produto: p.nomeProduto, quantidade: p.unidades, preco_unitario: 0 }))
      };

      try {
          let response;
          if (isEditing && editingSaleId) {
              response = await fetch(`/api/sales/${editingSaleId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
              });
          } else {
              response = await fetch('/api/sales', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
              });
          }

          if (!response.ok) throw new Error(await handleApiError(response, isEditing ? 'atualizar venda' : 'registrar venda'));
          
          const savedSaleData = await response.json();
          const savedSaleAppFormat = fromDatabaseRecord(savedSaleData);
          const completeSale: SalesData = { ...savedSaleAppFormat, produtos: saleData.produtos };
          
          if (isEditing) {
              setAllSales(prev => prev.map(s => s.id === editingSaleId ? completeSale : s));
              setLightboxMessage({ type: 'success', text: 'Venda atualizada com sucesso!' });
          } else {
              setAllSales(prev => [completeSale, ...prev]);
              setLightboxMessage({ type: 'success', text: 'Venda registrada com sucesso!' });
          }
      } catch (error: any) {
          setLightboxMessage({ type: 'error', text: error.message });
      }
      setEditingSaleId(null);
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta venda?")) return;
    try {
        const response = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(await handleApiError(response, 'excluir venda'));
        
        setAllSales(prev => prev.filter(s => s.id !== saleId));
        setLightboxMessage({ type: 'success', text: 'Venda excluída com sucesso.' });
    } catch (error: any) {
        setLightboxMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteEvent = async (eventName: string) => {
    const salesCount = allSales.filter(s => s.nomeEvento === eventName).length;
    if (!window.confirm(`Tem certeza que deseja apagar o evento "${eventName}" e todas as suas ${salesCount} vendas associadas? Esta ação é irreversível.`)) return;
    try {
        const response = await fetch(`/api/events/${encodeURIComponent(eventName)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(await handleApiError(response, 'excluir evento'));
      
        setAppEvents(prev => prev.filter(e => e.name !== eventName));
        setAllSales(prev => prev.filter(s => s.nomeEvento !== eventName));
        setFilterEvent('');
        setLightboxMessage({ type: 'success', text: `Evento "${eventName}" e todas as suas vendas foram excluídos.` });
    } catch (error: any) {
        setLightboxMessage({ type: 'error', text: error.message });
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
    const eventMap = new Map<string, string>();
    appEvents.forEach(e => { if (e.name && e.date) eventMap.set(e.name, e.date) });
    return Array.from(eventMap, ([name, date]) => ({ name, date })).sort((a,b) => a.name.localeCompare(b.name));
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
    });
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
    setAllSales([]);
    setIsDataLoaded(false);
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
  
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
        <img src="https://res.cloudinary.com/dqg7yc1du/image/upload/v1753963017/Logo_TMC_mnj699.png" alt="Logo da Empresa" className="h-24 w-auto mb-8" />
        <div>
            <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg text-gray-300 mt-4">Carregando dados...</p>
        </div>
      </div>
    );
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
              </>
            )}
            {currentView === 'dashboard' && (
              <ManagerialDashboard 
                allSales={allSales} 
                initialFilterEvent={filterEvent} 
                initialFilterUser={filterUser}
                uniqueEvents={uniqueEvents}
                uniqueUsers={uniqueUsers}
                onGoBack={navigateToSalesForm} 
              />
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