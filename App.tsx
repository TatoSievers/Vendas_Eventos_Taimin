
import React, { useState, useEffect, useMemo } from 'react';
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import InitialSetupForm from './components/InitialSetupForm';
import ManagerialDashboard from './components/ManagerialDashboard';
import Lightbox from './components/Lightbox';
import Header from './components/Header'; // Importação do novo cabeçalho
import { SalesData, EventDetail, UserDetail, InitialSetupData, PaymentMethodDetail, LightboxMessage } from './types';
import { supabase } from './lib/supabaseClient';
import { DEFAULT_USERS } from './constants';
import PasswordScreen from './components/PasswordScreen';

type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

const App: React.FC = () => {
  // --- Estados da Aplicação ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('setup');
  
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

    const fetchSales = async () => {
      try {
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;
        if (!salesData) {
          setAllSales([]);
          return;
        }

        const saleIds = salesData.map(s => s.id);
        
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
            if (!productsBySaleId.has(p.sale_id)) {
              productsBySaleId.set(p.sale_id, []);
            }
            productsBySaleId.get(p.sale_id)!.push({ nome_produto: p.nome_produto, quantidade: p.quantidade });
          });
        }
        
        const formattedSales = salesData.map(sale => ({
          ...sale,
          produtos: (productsBySaleId.get(sale.id) || []).map(p => ({
              nomeProduto: p.nome_produto,
              unidades: p.quantidade,
          })),
        })) as SalesData[];

        setAllSales(formattedSales);
        
      } catch (error: unknown) {
        console.error("Error loading data from Supabase:", error);
        
        let userMessage = "Falha ao carregar os dados. Verifique a conexão com a internet e tente novamente.";
        const errorString = String(error).toLowerCase();

        if (errorString.includes('permission denied') || errorString.includes('rls')) {
            userMessage = "Erro de permissão ao acessar o banco de dados. Verifique se as políticas de segurança (RLS) estão habilitadas e configuradas no Supabase para permitir leitura e escrita.";
        } else if (errorString.includes('failed to fetch')) {
            userMessage = "Falha na conexão com o servidor. Verifique sua URL do Supabase, a chave e as configurações de CORS. Certifique-se também de que sua internet está funcionando.";
        } else if (error && typeof error === 'object' && 'message' in error) {
            userMessage = `Ocorreu um erro inesperado: ${(error as { message: string }).message}`;
        } else {
            userMessage = `Ocorreu um erro inesperado: ${String(error)}`;
        }
        
        setLightboxMessage({ type: 'error', text: userMessage });
        setAllSales([]);
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchSales();
  }, [isAuthenticated]);


  // --- Funções de Manipulação de Dados ---
  
  const handleInitialSetupComplete = (setupData: InitialSetupData) => {
    setCurrentUser(setupData.userName);
    setCurrentEventName(setupData.eventName);
    setCurrentEventDate(setupData.eventDate);
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  };

  const handleSaveSale = async (saleData: SalesData, isEditing: boolean) => {
    const recordToSubmit = {
      nomeUsuario: saleData.nomeUsuario,
      nomeEvento: saleData.nomeEvento,
      dataEvento: saleData.dataEvento,
      primeiroNome: saleData.primeiroNome,
      sobrenome: saleData.sobrenome,
      cpf: saleData.cpf,
      email: saleData.email,
      ddd: saleData.ddd,
      telefoneNumero: saleData.telefoneNumero,
      logradouroRua: saleData.logradouroRua,
      numeroEndereco: saleData.numeroEndereco,
      complemento: saleData.complemento || null,
      bairro: saleData.bairro,
      cidade: saleData.cidade,
      estado: saleData.estado,
      cep: saleData.cep,
      formaPagamento: saleData.formaPagamento,
      observacao: saleData.observacao || null,
    };

    if (isEditing && editingSaleId) {
      try {
        const { error: saleUpdateError } = await supabase.from('sales').update(recordToSubmit).eq('id', editingSaleId);
        if (saleUpdateError) throw saleUpdateError;
        await supabase.from('sale_products').delete().eq('sale_id', editingSaleId);
        const productsToInsert = saleData.produtos.map(p => ({ sale_id: editingSaleId, nome_produto: p.nomeProduto, quantidade: p.unidades, preco_unitario: 0 }));
        if (productsToInsert.length > 0) {
          const { error } = await supabase.from('sale_products').insert(productsToInsert);
          if (error) throw error;
        }
        setAllSales(prev => prev.map(s => s.id === editingSaleId ? { ...s, ...recordToSubmit, produtos: saleData.produtos } : s));
        setLightboxMessage({ type: 'success', text: 'Venda atualizada com sucesso!' });
      } catch (error) {
        console.error("Error updating sale:", error);
        setLightboxMessage({ type: 'error', text: "Erro ao atualizar a venda." });
      }
    } else {
      try {
        const { data: inserted, error } = await supabase.from('sales').insert([recordToSubmit]).select().single();
        if (error || !inserted) throw error || new Error("Falha ao obter ID da nova venda");
        const productsToInsert = saleData.produtos.map(p => ({ sale_id: inserted.id, nome_produto: p.nomeProduto, quantidade: p.unidades, preco_unitario: 0 }));
        if (productsToInsert.length > 0) {
          const { error: pError } = await supabase.from('sale_products').insert(productsToInsert);
          if (pError) throw pError;
        }
        setAllSales(prev => [{ ...inserted, produtos: saleData.produtos } as SalesData, ...prev]);
        setLightboxMessage({ type: 'success', text: 'Venda registrada com sucesso!' });
      } catch (error) {
        console.error("Error creating sale:", error);
        setLightboxMessage({ type: 'error', text: "Erro ao registrar a venda." });
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
      console.error("Error deleting sale:", error);
      setLightboxMessage({ type: 'error', text: "Erro ao excluir a venda." });
    }
  };

  const handleDeleteEvent = async (eventName: string) => {
    const salesCount = allSales.filter(s => s.nomeEvento === eventName).length;
    if (!window.confirm(`Tem certeza que deseja apagar o evento "${eventName}" e todas as suas ${salesCount} vendas associadas? Esta ação é irreversível.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('sales').delete().eq('nomeEvento', eventName);
      if (error) throw error;

      setAllSales(prev => prev.filter(s => s.nomeEvento !== eventName));
      setFilterEvent(''); // Reseta o filtro
      setLightboxMessage({ type: 'success', text: `Evento "${eventName}" e todas as suas vendas foram excluídos.` });
    } catch (error) {
      console.error("Error deleting event:", error);
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
    return Array.from(eventMap, ([name, date]) => ({ name, date })).sort((a,b) => a.name.localeCompare(b.name));
  }, [allSales]);

  const uniqueUsers = useMemo<UserDetail[]>(() => {
    const userSet = new Set<string>(DEFAULT_USERS);
    allSales.forEach(s => { if (s.nomeUsuario) userSet.add(s.nomeUsuario) });
    return Array.from(userSet, name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSales]);

  const uniquePaymentMethods = useMemo<PaymentMethodDetail[]>(() => {
    const paymentMethodSet = new Set<string>();
    allSales.forEach(s => { if (s.formaPagamento) paymentMethodSet.add(s.formaPagamento) });
    return Array.from(paymentMethodSet, name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSales]);
  
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
    setIsDataLoaded(false); // Forçar recarregamento na próxima autenticação
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
          <InitialSetupForm onSetupComplete={handleInitialSetupComplete} uniqueEvents={uniqueEvents} uniqueUsers={uniqueUsers} />
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
                <SalesForm onSaveSale={handleSaveSale} editingSale={saleBeingEdited} onCancelEdit={handleCancelEdit} uniquePaymentMethods={uniquePaymentMethods} allSales={allSales} currentUser={currentUser} currentEventName={currentEventName} currentEventDate={currentEventDate} onGoBackToSetup={navigateToSetup} onNotify={setLightboxMessage} />
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
