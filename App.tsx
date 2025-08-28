
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import InitialSetupForm from './components/InitialSetupForm';
import ManagerialDashboard from './components/ManagerialDashboard';
import { SalesData, EventDetail, UserDetail, InitialSetupData, PaymentMethodDetail } from './types';

type AppView = 'setup' | 'salesFormAndList' | 'dashboard';

const LOCAL_STORAGE_KEY = 'vendasTaiminData';

const App: React.FC = () => {
  const [allSales, setAllSales] = useState<SalesData[]>([]);
  const [currentView, setCurrentView] = useState<AppView>('setup');
  
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [currentEventDate, setCurrentEventDate] = useState<string>('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Load sales data from localStorage on initial mount
  useEffect(() => {
    try {
      const storedSales = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSales) {
        const parsedSales: SalesData[] = JSON.parse(storedSales);
        setAllSales(parsedSales);
        console.log(`Vendas Taimin: ${parsedSales.length} sales records loaded successfully from localStorage.`);
      } else {
        console.log("Vendas Taimin: No sales records found in localStorage. Starting fresh.");
        setAllSales([]);
      }
    } catch (error) {
      console.error("Error loading sales from localStorage:", error);
      setAllSales([]); // Start with empty if localStorage is corrupt
    }
    setIsDataLoaded(true); // Mark data as loaded (or attempted to load)
  }, []);

  // Save sales data to localStorage whenever it changes
  useEffect(() => {
    if (isDataLoaded) { // Only save after initial load attempt
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSales));
        } catch (error) {
            console.error("Error saving sales to localStorage:", error);
            // Consider notifying user if storage is full or disabled
        }
    }
  }, [allSales, isDataLoaded]);

  const handleInitialSetupComplete = (setupData: InitialSetupData) => {
    setCurrentUser(setupData.userName);
    setCurrentEventName(setupData.eventName);
    setCurrentEventDate(setupData.eventDate);
    setEditingSaleId(null);
    setCurrentView('salesFormAndList');
  };

  const handleSaveSale = (saleData: SalesData, isEditing: boolean) => {
    setAllSales(prevSales => {
      if (isEditing && editingSaleId) {
        return prevSales.map(sale =>
          sale.id === editingSaleId ? { ...saleData, id: editingSaleId } : sale
        );
      } else {
        // For new sales, generate a simple unique ID client-side
        const newSaleWithId = { ...saleData, id: Date.now().toString(36) + Math.random().toString(36).substr(2) };
        return [...prevSales, newSaleWithId];
      }
    });
    setEditingSaleId(null); // Clear editing state after save
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
  
  // Prevent rendering main content until data is loaded to avoid flicker or premature calculations
  if (!isDataLoaded && currentView !== 'setup') {
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
