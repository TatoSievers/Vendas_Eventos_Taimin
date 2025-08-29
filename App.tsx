
import React, { useState, useEffect, useMemo } from 'react';
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import InitialSetupForm from './components/InitialSetupForm';
import ManagerialDashboard from './components/ManagerialDashboard';
import Lightbox from './components/Lightbox';
import { SalesData, EventDetail, UserDetail, InitialSetupData, PaymentMethodDetail, LightboxMessage } from './types';
import { supabase } from './lib/supabaseClient';
import { DEFAULT_USERS } from './constants';

type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

// =================================================================================
// CÓDIGO CORRIGIDO E SIMPLIFICADO
// =================================================================================
const App: React.FC = () => {
  // --- Estados da Aplicação ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('setup');
  
  // Estados para o contexto da venda (usuário, evento, etc.)
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const [lightboxMessage, setLightboxMessage] = useState<LightboxMessage | null>(null);
  
  // Pega a senha do arquivo de configuração .env
  // FIX: Cast `import.meta` to `any` to access the `env` property. This bypasses
  // the TypeScript error "Property 'env' does not exist on type 'ImportMeta'"
  // when Vite's type definitions are not found.
  const appPassword = (import.meta as any).env.VITE_APP_PASSWORD;

  // --- Efeito para Carregar os Dados ---
  // Roda apenas uma vez, quando o usuário for autenticado com sucesso.
  useEffect(() => {
    if (!isAuthenticated) return; // Só carrega os dados se estiver autenticado

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
        const { data: productsData, error: productsError } = await supabase
          .from('sale_products')
          .select('sale_id, nome_produto, quantidade')
          .in('sale_id', saleIds);
            
        if (productsError) throw productsError;

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
        console.log(`Vendas Taimin: ${formattedSales.length} sales records loaded successfully.`);
        
      } catch (error) {
        console.error("Error loading sales from Supabase:", error);
        setLightboxMessage({ type: 'error', text: "Falha ao carregar os dados. Verifique a conexão." });
        setAllSales([]);
      } finally {
        setIsDataLoaded(true); // Marca que os dados foram carregados (ou falharam ao carregar)
      }
    };

    fetchSales();
  }, [isAuthenticated]); // A dependência garante que rode quando `isAuthenticated` se torna `true`


  // --- Funções de Manipulação de Dados ---
  
  const handleInitialSetupComplete = (setupData: InitialSetupData) => {
    setCurrentUser(setupData.userName);
    setCurrentEventName(setupData.eventName);
    setCurrentEventDate(setupData.eventDate);
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  };

  const handleSaveSale = async (saleData: SalesData, isEditing: boolean) => {
    // Lógica para salvar a venda (CREATE ou UPDATE)
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
      observacao: saleData.observacao || null, // restaurado
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

  const saleBeingEdited = editingSaleId ? allSales.find(s => s.id === editingSaleId) || null : null;
  
  // =================================================================================
  // LÓGICA DE RENDERIZAÇÃO ROBUSTA
  // =================================================================================

  // 1. Verifica se a senha está configurada no ambiente. Se não, mostra erro.
  if (!appPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
        <div className="text-center bg-slate-800 p-8 rounded-lg shadow-2xl">
          <h1 className="text-2xl text-red-400 font-bold">Erro de Configuração</h1>
          <p className="text-lg text-gray-300 mt-2">A senha de acesso não foi configurada.</p>
        </div>
      </div>
    );
  }

  // 2. Se não estiver autenticado, mostra a tela de senha.
  if (!isAuthenticated) {
    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const passwordInput = (e.target as HTMLFormElement).password.value;
      if (passwordInput === appPassword) {
        setIsAuthenticated(true); // Autentica com sucesso
      } else {
        alert("Senha incorreta!");
      }
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <div className="w-full max-w-sm">
          <form onSubmit={handlePasswordSubmit} className="bg-slate-800 shadow-2xl rounded-lg px-8 pt-6 pb-8">
            <h1 className="text-2xl text-white font-bold mb-6 text-center">Acesso Restrito</h1>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center justify-center">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  // 3. Se estiver autenticado, mas os dados ainda não carregaram, mostra o loader.
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // 4. Se estiver autenticado e os dados carregados, mostra a aplicação principal.
  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-gray-200">
      <header className="my-6 md:my-8 text-center w-full max-w-4xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Vendas Taimin</h1>
      </header>
      <main className="w-full flex flex-col items-center space-y-8 md:space-y-12">
        {currentView === 'setup' && (
          <InitialSetupForm onSetupComplete={handleInitialSetupComplete} uniqueEvents={uniqueEvents} uniqueUsers={uniqueUsers} />
        )}
        {currentView === 'salesFormAndList' && (
          <>
            <SalesForm onSaveSale={handleSaveSale} editingSale={saleBeingEdited} onCancelEdit={handleCancelEdit} uniqueEvents={uniqueEvents} uniquePaymentMethods={uniquePaymentMethods} allSales={allSales} currentUser={currentUser} currentEventName={currentEventName} currentEventDate={currentEventDate} onGoBackToSetup={navigateToSetup} onNotify={setLightboxMessage} />
            <SalesList sales={allSales} onNavigateToDashboard={navigateToDashboard} onEditSale={handleSetEditingSale} onDeleteSale={handleDeleteSale} onNotify={setLightboxMessage} />
          </>
        )}
        {currentView === 'dashboard' && (
          // FIX: Removed uniqueEvents prop as it is not defined in ManagerialDashboardProps.
          <ManagerialDashboard sales={allSales} onGoBack={navigateToSalesForm} />
        )}
      </main>
      {lightboxMessage && <Lightbox message={lightboxMessage} onClose={() => setLightboxMessage(null)} />}
      <footer className="w-full text-center py-8 mt-auto">
        <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Vendas Taimin.</p>
      </footer>
    </div>
  );
};

export default App;
