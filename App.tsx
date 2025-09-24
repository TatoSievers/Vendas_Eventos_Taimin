

import React, { useState, useEffect, useMemo } from 'react';
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import InitialSetupForm from './components/InitialSetupForm';
import ManagerialDashboard from './components/ManagerialDashboard';
import Lightbox from './components/Lightbox';
import Header from './components/Header'; // Importação do novo cabeçalho
import { SalesData, EventDetail, UserDetail, InitialSetupData, PaymentMethodDetail, LightboxMessage } from './types';
import { supabase } from './lib/supabaseClient';
import PasswordScreen from './components/PasswordScreen';

// --- Helper Functions for Data Mapping ---

// Maps database lowercase keys to application camelCase keys
const keyMapFromDb: { [key: string]: string } = {
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

// Create the reverse map for writing TO the DB
const keyMapToDb = Object.fromEntries(
    Object.entries(keyMapFromDb).map(([dbKey, appKey]) => [appKey, dbKey])
);

// Converts a single record from database (lowercase keys) to application format (camelCase keys)
const fromDatabaseRecord = (dbRecord: { [key: string]: any }): { [key: string]: any } => {
    const appRecord: { [key: string]: any } = {};
    for (const dbKey in dbRecord) {
        const appKey = keyMapFromDb[dbKey] || dbKey;
        appRecord[appKey] = dbRecord[dbKey];
    }
    return appRecord;
};

// Converts a record from application format (camelCase) to database format (lowercase) using an explicit map
const toDatabaseRecord = (appRecord: { [key: string]: any }): { [key: string]: any } => {
  const dbRecord: { [key: string]: any } = {};
  for (const appKey in appRecord) {
    const dbKey = keyMapToDb[appKey];
    if (dbKey) { // Only map keys that are defined in our map
        dbRecord[dbKey] = appRecord[appKey];
    }
  }
  return dbRecord;
};


type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

const App: React.FC = () => {
  // --- Estados da Aplicação ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('setup');
  
  // Estados de dados independentes
  const [appUsers, setAppUsers] = useState<UserDetail[]>([]);
  const [appEvents, setAppEvents] = useState<EventDetail[]>([]);
  const [appPaymentMethods, setAppPaymentMethods] = useState<PaymentMethodDetail[]>([]);


  // Estados para o contexto da venda
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  // Estados de filtro (movidos para o nível do App)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const [lightboxMessage, setLightboxMessage] = useState<LightboxMessage | null>(null);
  
  const appPassword = (import.meta as any).env.VITE_APP_PASSWORD;

  // --- Efeito para Carregar os Dados ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchInitialData = async () => {
      try {
        // Busca de vendas e produtos (lógica existente)
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;
        
        const saleIds = salesData ? salesData.map(s => s.id) : [];
        let productsData: { sale_id: string; nome_produto: string; quantidade: number; }[] | null = [];
        if (saleIds.length > 0) {
            const { data, error: productsError } = await supabase
              .from('sale_products')
              .select('sale_id, nome_produto, quantidade')
              .in('sale_id', saleIds);
            if (productsError) throw productsError;
            productsData = data;
        }

        const productsBySaleId = new Map<string, { nome_produto: string; quantidade: number }[]>();
        if (productsData) {
          productsData.forEach(p => {
            if (!productsBySaleId.has(p.sale_id)) productsBySaleId.set(p.sale_id, []);
            productsBySaleId.get(p.sale_id)!.push({ nome_produto: p.nome_produto, quantidade: p.quantidade });
          });
        }
        
        const formattedSales = salesData ? salesData.map(dbSale => {
          const appSale = fromDatabaseRecord(dbSale);
          return {
            ...appSale,
            produtos: (productsBySaleId.get(dbSale.id) || []).map(p => ({
              nomeProduto: p.nome_produto,
              unidades: p.quantidade,
            })),
          };
        }) as SalesData[] : [];
        setAllSales(formattedSales);

        // Novas buscas para usuários, eventos e formas de pagamento
        const { data: usersData, error: usersError } = await supabase.from('app_users').select('name');
        if (usersError) throw usersError;
        setAppUsers(usersData || []);

        const { data: eventsData, error: eventsError } = await supabase.from('app_events').select('name, date');
        if (eventsError) throw eventsError;
        setAppEvents(eventsData || []);
        
        const { data: paymentMethodsData, error: paymentMethodsError } = await supabase.from('payment_methods').select('name');
        if (paymentMethodsError) throw paymentMethodsError;
        setAppPaymentMethods(paymentMethodsData || []);
        
      } catch (error: unknown) {
        console.error("Error loading data from Supabase:", error);
        let userMessage = "Falha ao carregar os dados. Verifique a conexão com a internet e tente novamente.";
        const errorString = String(error).toLowerCase();

        if (errorString.includes('relation "public.app_users" does not exist') || errorString.includes('relation "public.payment_methods" does not exist')) {
            userMessage = "As tabelas de configuração (usuários/eventos/pagamentos) não foram encontradas. Por favor, execute o script SQL de atualização no painel do Supabase.";
        } else if (errorString.includes('permission denied') || errorString.includes('rls')) {
            userMessage = "Erro de permissão ao acessar o banco de dados. Verifique se as políticas de segurança (RLS) estão habilitadas e configuradas no Supabase para permitir leitura e escrita.";
        } else if (errorString.includes('failed to fetch')) {
            userMessage = "Falha na conexão com o servidor. Verifique sua URL do Supabase, a chave e as configurações de CORS.";
        } else if (error && typeof error === 'object' && 'message' in error) {
            userMessage = `Ocorreu um erro inesperado: ${(error as { message: string }).message}`;
        }
        
        setLightboxMessage({ type: 'error', text: userMessage });
        setAllSales([]);
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchInitialData();
  }, [isAuthenticated]);


  // --- Funções de Manipulação de Dados ---
  
  const handleInitialSetupComplete = (setupData: InitialSetupData) => {
    setCurrentUser(setupData.userName);
    setCurrentEventName(setupData.eventName);
    setCurrentEventDate(setupData.eventDate);
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  };

  const handleDBError = (error: unknown, action: 'registrar' | 'atualizar' | 'criar'): string => {
    console.error(`Error ${action} item:`, error);
    let detailedMessage = `Erro ao ${action} o item.`;

    if (error && typeof error === 'object' && 'message' in error) {
        const dbError = error as { message: string, details?: string, code?: string };
        const errorMessage = dbError.message.toLowerCase();
        
        if (dbError.details) {
            detailedMessage = `Erro: ${dbError.details}`;
        } else if (errorMessage.includes('not-null constraint')) {
            const match = errorMessage.match(/column "(.*?)"/);
            detailedMessage = `Erro: O campo obrigatório '${match ? match[1] : ''}' não foi preenchido.`;
        } else if (errorMessage.includes('duplicate key value violates unique constraint')) {
            detailedMessage = "Erro: Já existe um registro com este nome. Por favor, escolha outro.";
        } else {
            detailedMessage = `Erro do banco de dados: ${dbError.message}`;
        }
    }
    return detailedMessage;
  }

  const handleCreateUser = async (name: string) => {
    try {
      const { data, error } = await supabase.from('app_users').insert({ name }).select().single();
      if (error) throw error;
      if (data) setAppUsers(prev => [...prev, { name: data.name }]);
    } catch (error) {
      if (String(error).includes('duplicate key')) {
        console.warn(`User "${name}" already exists.`); // Don't bother user if it already exists
        return;
      }
      throw new Error(handleDBError(error, 'criar'));
    }
  };

  const handleCreateEvent = async (name: string, date: string) => {
    try {
      const { data, error } = await supabase.from('app_events').insert({ name, date }).select().single();
      if (error) throw error;
      if (data) setAppEvents(prev => [...prev, { name: data.name, date: data.date }]);
    } catch (error) {
      if (String(error).includes('duplicate key')) {
        console.warn(`Event "${name}" already exists.`);
        return;
      }
      throw new Error(handleDBError(error, 'criar'));
    }
  };
  
  const handleCreatePaymentMethod = async (name: string) => {
    try {
      const { data, error } = await supabase.from('payment_methods').insert({ name }).select().single();
      if (error) throw error;
      if (data) setAppPaymentMethods(prev => [...prev, { name: data.name }]);
    } catch (error) {
      if (String(error).includes('duplicate key')) {
        console.warn(`Payment method "${name}" already exists.`);
        return;
      }
      throw new Error(handleDBError(error, 'criar'));
    }
  };


  const handleSaveSale = async (saleData: SalesData, isEditing: boolean) => {
    // Create a clean payload for the 'sales' table by excluding properties
    // that are handled separately (produtos) or are auto-generated by the database (id, created_at).
    const { produtos, created_at, id, ...salePayload } = saleData;
    
    const recordToSubmitDb = toDatabaseRecord(salePayload);

    if (isEditing && editingSaleId) {
      try {
        const { error: saleUpdateError } = await supabase.from('sales').update(recordToSubmitDb).eq('id', editingSaleId);
        if (saleUpdateError) throw saleUpdateError;
        await supabase.from('sale_products').delete().eq('sale_id', editingSaleId);
        const productsToInsert = saleData.produtos.map(p => ({ sale_id: editingSaleId, nome_produto: p.nomeProduto, quantidade: p.unidades, preco_unitario: 0 }));
        if (productsToInsert.length > 0) {
          const { error } = await supabase.from('sale_products').insert(productsToInsert);
          if (error) throw error;
        }
        // Atualiza o estado local com os dados completos vindos do formulário
        setAllSales(prev => prev.map(s => (s.id === editingSaleId ? saleData : s)));
        setLightboxMessage({ type: 'success', text: 'Venda atualizada com sucesso!' });
      } catch (error) {
        setLightboxMessage({ type: 'error', text: handleDBError(error, 'atualizar') });
      }
    } else {
      try {
        const { data: inserted, error } = await supabase.from('sales').insert([recordToSubmitDb]).select().single();
        if (error || !inserted) throw error || new Error("Falha ao obter ID da nova venda");
        const productsToInsert = saleData.produtos.map(p => ({ sale_id: inserted.id, nome_produto: p.nomeProduto, quantidade: p.unidades, preco_unitario: 0 }));
        if (productsToInsert.length > 0) {
          const { error: pError } = await supabase.from('sale_products').insert(productsToInsert);
          if (pError) throw pError;
        }
        const newSaleAppFormat = fromDatabaseRecord(inserted);
        // Junta o retorno do DB (com id/created_at) com os produtos do formulário
        const newCompleteSale: SalesData = {
          ...(newSaleAppFormat as Omit<SalesData, 'produtos'>),
          produtos: saleData.produtos,
        };
        setAllSales(prev => [newCompleteSale, ...prev]);
        setLightboxMessage({ type: 'success', text: 'Venda registrada com sucesso!' });
      } catch (error) {
        setLightboxMessage({ type: 'error', text: handleDBError(error, 'registrar') });
      }
    }
    setEditingSaleId(null);
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta venda?")) return;
    try {
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;
      setAllSales(prev => prev.filter(s => s.id !== saleId));
      setLightboxMessage({ type: 'success', text: 'Venda excluída com sucesso.' });
    } catch (error) {
      setLightboxMessage({ type: 'error', text: "Erro ao excluir a venda." });
    }
  };

  const handleDeleteEvent = async (eventName: string) => {
    const salesCount = allSales.filter(s => s.nomeEvento === eventName).length;
    if (!window.confirm(`Tem certeza que deseja apagar o evento "${eventName}" e todas as suas ${salesCount} vendas associadas? Esta ação é irreversível.`)) return;

    try {
      const { error } = await supabase.from('sales').delete().eq('nomeEvento', eventName);
      if (error) throw error;

      await supabase.from('app_events').delete().eq('name', eventName);
      
      setAppEvents(prev => prev.filter(e => e.name !== eventName));
      setAllSales(prev => prev.filter(s => s.nomeEvento !== eventName));
      setFilterEvent(''); // Reseta o filtro
      setLightboxMessage({ type: 'success', text: `Evento "${eventName}" e todas as suas vendas foram excluídos.` });
    } catch (error) {
      setLightboxMessage({ type: 'error', text: "Erro ao excluir o evento." });
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

  // --- Dados Memoizados para Performance ---
  const uniqueEvents = useMemo<EventDetail[]>(() => {
    const eventMap = new Map<string, string>();
    allSales.forEach(s => { if (s.nomeEvento && s.dataEvento) eventMap.set(s.nomeEvento, s.dataEvento) });
    appEvents.forEach(e => { if (e.name && e.date) eventMap.set(e.name, e.date) });
    return Array.from(eventMap, ([name, date]) => ({ name, date })).sort((a,b) => a.name.localeCompare(b.name));
  }, [allSales, appEvents]);

  const uniqueUsers = useMemo<UserDetail[]>(() => {
    const userSet = new Set<string>(appUsers.map(u => u.name));
    allSales.forEach(s => { if (s.nomeUsuario) userSet.add(s.nomeUsuario) });
    return Array.from(userSet, name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSales, appUsers]);

  const uniquePaymentMethods = useMemo<PaymentMethodDetail[]>(() => {
    const paymentMethodSet = new Set<string>(appPaymentMethods.map(pm => pm.name));
    allSales.forEach(s => { if (s.formaPagamento) paymentMethodSet.add(s.formaPagamento) });
    return Array.from(paymentMethodSet, name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSales, appPaymentMethods]);
  
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

  // --- Funções de Navegação ---
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
    if (currentView === 'dashboard') {
      navigateToSalesForm();
    } else if (currentView === 'salesFormAndList') {
      navigateToSetup();
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('setup');
    setCurrentUser('');
    setCurrentEventName('');
    setCurrentEventDate('');
    setEditingSaleId(null);
    setAllSales([]);
    setAppUsers([]);
    setAppEvents([]);
    setAppPaymentMethods([]);
    setIsDataLoaded(false);
  };

  const saleBeingEdited = editingSaleId ? allSales.find(s => s.id === editingSaleId) || null : null;
  
  // --- Lógica de Renderização ---

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