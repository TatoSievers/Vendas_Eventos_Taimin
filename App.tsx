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

const App: React.FC = () => {
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('setup');
  
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [lightboxMessage, setLightboxMessage] = useState<LightboxMessage | null>(null);

  // Load sales data from Supabase on initial mount
  useEffect(() => {
    const fetchSales = async () => {
      try {
        // Step 1: Fetch all main sales records
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;
        if (!salesData) {
          setAllSales([]);
          return;
        }

        // Step 2: Fetch all related products if there are sales
        let productsBySaleId = new Map<string, { nome_produto: string; quantidade: number }[]>();
        if (salesData.length > 0) {
            const saleIds = salesData.map(s => s.id);
            
            // =================================================================
            // CORREÇÃO 1: Usar 'nome_produto' e 'quantidade' no SELECT
            // =================================================================
            const { data: productsData, error: productsError } = await supabase
              .from('sale_products')
              .select('sale_id, nome_produto, quantidade') // <-- AJUSTADO AQUI
              .in('sale_id', saleIds);
            
            if (productsError) throw productsError;

            // Step 3: Create a map for efficient product lookups
            if (productsData) {
              productsData.forEach(p => {
                if (!productsBySaleId.has(p.sale_id)) {
                  productsBySaleId.set(p.sale_id, []);
                }
                // =================================================================
                // CORREÇÃO 2: Usar 'p.nome_produto' e 'p.quantidade' ao ler os dados
                // =================================================================
                productsBySaleId.get(p.sale_id)!.push({ nome_produto: p.nome_produto, quantidade: p.quantidade }); // <-- AJUSTADO AQUI
              });
            }
        }
        
        // Step 4: Combine sales data with their respective products
        const formattedSales = salesData.map(sale => ({
          ...sale,
          // Mapeamos de volta para o formato que o resto do app espera (se necessário), ou mantemos o padrão do DB
          produtos: (productsBySaleId.get(sale.id) || []).map(p => ({
              nomeProduto: p.nome_produto, // Convertendo de volta para o código usar
              unidades: p.quantidade,     // Convertendo de volta para o código usar
          })),
        })) as SalesData[];

        setAllSales(formattedSales);
        console.log(`Vendas Taimin: ${formattedSales.length} sales records loaded successfully from Supabase.`);
        
      } catch (error) {
        console.error("Error loading sales from Supabase:", error);
        setLightboxMessage({ type: 'error', text: "Falha ao carregar os dados de vendas. Verifique sua conexão e tente recarregar a página." });
        setAllSales([]);
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchSales();
  }, []);


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
      observacao: saleData.observacao || null
    };

    if (isEditing && editingSaleId) {
      // UPDATE logic
      try {
        const { error: saleUpdateError } = await supabase
          .from('sales')
          .update(recordToSubmit)
          .eq('id', editingSaleId);
        if (saleUpdateError) throw saleUpdateError;

        const { error: productDeleteError } = await supabase.from('sale_products').delete().eq('sale_id', editingSaleId);
        if (productDeleteError) throw productDeleteError;

        // =================================================================
        // CORREÇÃO 3: Usar 'nome_produto' e 'quantidade' ao ENVIAR dados
        // =================================================================
        const productsToInsert = saleData.produtos.map(p => ({ 
            sale_id: editingSaleId, 
            nome_produto: p.nomeProduto, // <-- AJUSTADO AQUI
            quantidade: p.unidades,       // <-- AJUSTADO AQUI
            preco_unitario: 0 // Você precisará adicionar o preço aqui depois
        }));

        if (productsToInsert.length > 0) {
            const { error: productInsertError } = await supabase.from('sale_products').insert(productsToInsert);
            if (productInsertError) throw productInsertError;
        }

        setAllSales(prevSales => prevSales.map(sale =>
            sale.id === editingSaleId ? { ...sale, ...recordToSubmit, produtos: saleData.produtos } : sale
        ));
        setLightboxMessage({ type: 'success', text: 'Venda atualizada com sucesso!' });
      } catch (error) {
        console.error("Error updating sale:", error);
        setLightboxMessage({ type: 'error', text: "Ocorreu um erro ao atualizar a venda. Por favor, tente novamente." });
      }
    } else {
      // CREATE logic
      try {
        const { data: insertedSale, error: saleInsertError } = await supabase
          .from('sales')
          .insert([recordToSubmit])
          .select()
          .single();
        if (saleInsertError || !insertedSale) throw saleInsertError || new Error("Failed to get new sale ID");

        // =================================================================
        // CORREÇÃO 4: Usar 'nome_produto' e 'quantidade' ao ENVIAR dados
        // =================================================================
        const productsToInsert = saleData.produtos.map(p => ({ 
            sale_id: insertedSale.id, 
            nome_produto: p.nomeProduto, // <-- AJUSTADO AQUI
            quantidade: p.unidades,       // <-- AJUSTADO AQUI
            preco_unitario: 0 // Você precisará adicionar o preço aqui depois
        }));

        if (productsToInsert.length > 0) {
            const { error: productInsertError } = await supabase.from('sale_products').insert(productsToInsert);
            if (productInsertError) throw productInsertError;
        }

        const newSaleWithProducts = { ...insertedSale, produtos: saleData.produtos } as SalesData;
        setAllSales(prevSales => [newSaleWithProducts, ...prevSales]);
        setLightboxMessage({ type: 'success', text: 'Venda registrada com sucesso!' });
      } catch (error) {
        console.error("Error creating sale:", error);
        setLightboxMessage({ type: 'error', text: "Ocorreu um erro ao registrar a nova venda. Por favor, tente novamente." });
      }
    }
    setEditingSaleId(null);
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;

      setAllSales(prevSales => prevSales.filter(sale => sale.id !== saleId));
      console.log(`Sale with ID ${saleId} deleted successfully.`);
      setLightboxMessage({ type: 'success', text: 'Venda excluída com sucesso.' });
    } catch (error) {
      console.error("Error deleting sale:", error);
      setLightboxMessage({ type: 'error', text: "Ocorreu um erro ao excluir a venda. Por favor, tente novamente." });
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

  const handleCancelEdit = () => {
    setEditingSaleId(null);
  };

  const uniqueEvents = useMemo<EventDetail[]>(() => {
    const eventMap = new Map<string, string>();
    allSales.forEach(sale => {
      if (sale.nomeEvento && sale.dataEvento && !eventMap.has(sale.nomeEvento)) {
        eventMap.set(sale.nomeEvento, sale.dataEvento);
      }
    });
    const events = Array.from(eventMap, ([name, date]) => ({ name, date }));
    events.sort((a, b) => a.name.localeCompare(b.name));
    return events;
  }, [allSales]);

  const uniqueUsers = useMemo<UserDetail[]>(() => {
    const userSet = new Set<string>(DEFAULT_USERS);
    allSales.forEach(sale => {
      if (sale.nomeUsuario) {
        userSet.add(sale.nomeUsuario);
      }
    });
    const users = Array.from(userSet, (name) => ({ name }));
    users.sort((a, b) => a.name.localeCompare(b.name));
    return users;
  }, [allSales]);

  const uniquePaymentMethods = useMemo<PaymentMethodDetail[]>(() => {
    const paymentMethodSet = new Set<string>();
    allSales.forEach(sale => {
      if (sale.formaPagamento) {
        paymentMethodSet.add(sale.formaPagamento);
      }
    });
    const methods = Array.from(paymentMethodSet, (name) => ({ name }));
    methods.sort((a, b) => a.name.localeCompare(b.name));
    return methods;
  }, [allSales]);

  const navigateToDashboard = () => setCurrentView('dashboard');
  const navigateToSalesForm = () => {
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  }
  const navigateToSetup = () => {
    setCurrentUser('');
    setCurrentEventName('');
    setCurrentEventDate('');
    setEditingSaleId(null);
    setCurrentView('setup');
  }

  const saleBeingEdited = editingSaleId ? allSales.find(s => s.id === editingSaleId) || null : null;
  
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-gray-200">
        <svg className="animate-spin h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Carregando dados...
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-gray-200">
      <header className="my-6 md:my-8 text-center w-full max-w-4xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Vendas Taimin</h1>
        {currentView === 'setup' && <p className="text-lg text-gray-300 mt-2">Configure o usuário e o evento para iniciar os registros.</p>}
        {currentView === 'salesFormAndList' && <p className="text-lg text-gray-300 mt-2">Registre e consulte suas vendas de forma eficiente.</p>}
        {currentView === 'dashboard' && <p className="text-lg text-gray-300 mt-2">Visualize os relatórios gerenciais.</p>}
      </header>

      <main className="w-full flex flex-col items-center space-y-8 md:space-y-12">
        {currentView === 'setup' && (
          <InitialSetupForm
            onSetupComplete={handleInitialSetupComplete}
            uniqueEvents={uniqueEvents}
            uniqueUsers={uniqueUsers}
          />
        )}

        {currentView === 'salesFormAndList' && (
          <>
            <SalesForm
              onSaveSale={handleSaveSale}
              editingSale={saleBeingEdited}
              onCancelEdit={handleCancelEdit}
              uniqueEvents={uniqueEvents} 
              uniquePaymentMethods={uniquePaymentMethods}
              allSales={allSales}
              currentUser={currentUser}
              currentEventName={currentEventName}
              currentEventDate={currentEventDate}
              onGoBackToSetup={navigateToSetup}
              onNotify={setLightboxMessage}
            />
            <SalesList 
              sales={allSales} 
              onNavigateToDashboard={navigateToDashboard}
              onEditSale={handleSetEditingSale}
              onDeleteSale={handleDeleteSale}
              onNotify={setLightboxMessage}
            />
          </>
        )}

        {currentView === 'dashboard' && (
          <ManagerialDashboard sales={allSales} onGoBack={navigateToSalesForm} />
        )}
      </main>

      {lightboxMessage && <Lightbox message={lightboxMessage} onClose={() => setLightboxMessage(null)} />}

      <footer className="w-full text-center py-8 mt-auto">
        <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Vendas Taimin. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;