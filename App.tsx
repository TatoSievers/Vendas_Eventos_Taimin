
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import InitialSetupForm from './components/InitialSetupForm';
import ManagerialDashboard from './components/ManagerialDashboard';
import { SalesData, EventDetail, UserDetail, InitialSetupData, PaymentMethodDetail } from './types';
import { supabase } from './lib/supabaseClient';

type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

const App: React.FC = () => {
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('setup');
  
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Load sales data from Supabase on initial mount
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*, sale_products(nomeProduto, unidades)')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          const formattedSales = data.map(sale => {
            const { sale_products, ...rest } = sale;
            return {
              ...rest,
              produtos: sale_products || [],
            } as SalesData;
          });
          setAllSales(formattedSales);
          console.log(`Vendas Taimin: ${formattedSales.length} sales records loaded successfully from Supabase.`);
        }
      } catch (error) {
        console.error("Error loading sales from Supabase:", error);
        alert("Falha ao carregar os dados de vendas. Verifique sua conexão e tente recarregar a página.");
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
    if (isEditing && editingSaleId) {
      // UPDATE logic
      const { produtos, ...saleDetails } = saleData;
      try {
        const { error: saleUpdateError } = await supabase
          .from('sales')
          .update(saleDetails)
          .eq('id', editingSaleId);
        if (saleUpdateError) throw saleUpdateError;

        // Easiest way to handle product updates: delete old, insert new
        const { error: productDeleteError } = await supabase.from('sale_products').delete().eq('sale_id', editingSaleId);
        if (productDeleteError) throw productDeleteError;

        const productsToInsert = produtos.map(p => ({ sale_id: editingSaleId, nomeProduto: p.nomeProduto, unidades: p.unidades }));
        if (productsToInsert.length > 0) {
            const { error: productInsertError } = await supabase.from('sale_products').insert(productsToInsert);
            if (productInsertError) throw productInsertError;
        }

        setAllSales(prevSales => prevSales.map(sale =>
            sale.id === editingSaleId ? { ...saleDetails, id: editingSaleId, produtos } : sale
        ));

      } catch (error) {
        console.error("Error updating sale:", error);
        alert("Ocorreu um erro ao atualizar a venda. Por favor, tente novamente.");
      }
    } else {
      // CREATE logic
      const { id, produtos, ...newSaleDetails } = saleData;
      try {
        const { data: insertedSale, error: saleInsertError } = await supabase
          .from('sales')
          .insert(newSaleDetails)
          .select()
          .single();
        if (saleInsertError || !insertedSale) throw saleInsertError || new Error("Failed to get new sale ID");

        const productsToInsert = produtos.map(p => ({ sale_id: insertedSale.id, nomeProduto: p.nomeProduto, unidades: p.unidades }));
         if (productsToInsert.length > 0) {
            const { error: productInsertError } = await supabase.from('sale_products').insert(productsToInsert);
            if (productInsertError) throw productInsertError;
        }

        const newSaleWithProducts = { ...insertedSale, produtos } as SalesData;
        setAllSales(prevSales => [newSaleWithProducts, ...prevSales]);

      } catch (error) {
        console.error("Error creating sale:", error);
        alert("Ocorreu um erro ao registrar a nova venda. Por favor, tente novamente.");
      }
    }
    setEditingSaleId(null);
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      // Thanks to 'ON DELETE CASCADE' in the database schema, we only need to delete the sale.
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;

      setAllSales(prevSales => prevSales.filter(sale => sale.id !== saleId));
      console.log(`Sale with ID ${saleId} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting sale:", error);
      alert("Ocorreu um erro ao excluir a venda. Por favor, tente novamente.");
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
    const userSet = new Set<string>();
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
    setEditingSaleId(null); // Ensure editing mode is off when just navigating
    setCurrentView('salesFormAndList');
  }
  const navigateToSetup = () => {
    // Reset context when going back to setup
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
            />
            <SalesList 
              sales={allSales} 
              onNavigateToDashboard={navigateToDashboard}
              onEditSale={handleSetEditingSale}
              onDeleteSale={handleDeleteSale}
            />
          </>
        )}

        {currentView === 'dashboard' && (
          <ManagerialDashboard sales={allSales} onGoBack={navigateToSalesForm} />
        )}
      </main>

      <footer className="w-full text-center py-8 mt-auto">
        <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Vendas Taimin. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;