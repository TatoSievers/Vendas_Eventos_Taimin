import React, { useMemo, useEffect, useRef, useState } from 'react'; // 1. Importa o useState
import { SalesData } from '../types';
import { ArrowUturnLeftIcon } from './icons';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

interface ManagerialDashboardProps {
  sales: SalesData[];
  onGoBack: () => void;
}

interface ProductSummary { [productName: string]: number; }
interface EventSummary { [eventName: string]: number; }
interface UserSalesSummary { [userName: string]: { totalUnitsSold: number; salesCount: number }; }

const getChartOptions = (titleText: string, isPieChart: boolean = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: isPieChart ? 'top' as const : 'bottom' as const,
      labels: { color: '#e5e7eb', font: { size: 12 } }
    },
    title: {
      display: true,
      text: titleText,
      color: '#f9fafb',
      font: { size: 16, weight: 'bold' as const }
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
    }
  },
  scales: isPieChart ? {} : {
    x: {
      ticks: { color: '#d1d5db' },
      grid: { color: 'rgba(209, 213, 219, 0.1)' }
    },
    y: {
      ticks: { color: '#d1d5db' },
      grid: { color: 'rgba(209, 213, 219, 0.1)' },
      beginAtZero: true
    }
  }
});

const chartColors = [
  '#34d399', '#fbbf24', '#60a5fa', '#f87171',
  '#a78bfa', '#22d3ee', '#f472b6', '#84cc16',
];

const ManagerialDashboard: React.FC<ManagerialDashboardProps> = ({ sales, onGoBack }) => {
  // 2. Estado para controlar o evento selecionado no filtro
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  // 3. Lógica para filtrar as vendas com base no evento selecionado
  const filteredSales = useMemo(() => {
    if (selectedEvent === 'all') {
      return sales; // Se 'Todos' estiver selecionado, usa todas as vendas
    }
    return sales.filter(sale => sale.nomeEvento === selectedEvent);
  }, [sales, selectedEvent]);

  // Extrai a lista de eventos únicos para popular o dropdown do filtro
  const uniqueEvents = useMemo(() => {
    const eventSet = new Set(sales.map(sale => sale.nomeEvento));
    return Array.from(eventSet).sort();
  }, [sales]);


  // =================================================================================
  // TODAS AS MÉTRICAS ABAIXO AGORA USAM 'filteredSales' EM VEZ DE 'sales'
  // =================================================================================

  const totalSalesCount = filteredSales.length;

  const salesPerProduct = useMemo<ProductSummary>(() => {
    const summary: ProductSummary = {};
    filteredSales.forEach(sale => {
      sale.produtos.forEach(item => {
        summary[item.nomeProduto] = (summary[item.nomeProduto] || 0) + item.unidades;
      });
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b - a));
  }, [filteredSales]);

  const salesPerEvent = useMemo<EventSummary>(() => {
    const summary: EventSummary = {};
    filteredSales.forEach(sale => {
      summary[sale.nomeEvento] = (summary[sale.nomeEvento] || 0) + 1;
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b - a));
  }, [filteredSales]);

  const userSalesData = useMemo<UserSalesSummary>(() => {
    const summary: UserSalesSummary = {};
    filteredSales.forEach(sale => {
      const userName = sale.nomeUsuario;
      if (!summary[userName]) {
        summary[userName] = { totalUnitsSold: 0, salesCount: 0 };
      }
      summary[userName].salesCount += 1;
      sale.produtos.forEach(item => {
        summary[userName].totalUnitsSold += item.unidades;
      });
    });
    return Object.fromEntries(
      Object.entries(summary).sort(([, a], [, b]) => b.totalUnitsSold - a.totalUnitsSold)
    );
  }, [filteredSales]);

  const productChartRef = useRef<HTMLCanvasElement>(null);
  const eventChartRef = useRef<HTMLCanvasElement>(null);
  const userChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const chartInstances: Chart[] = [];
    
    // Product Sales Chart
    if (productChartRef.current && Object.keys(salesPerProduct).length > 0) {
      const productCtx = productChartRef.current.getContext('2d');
      if (productCtx) {
        const productChart = new Chart(productCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(salesPerProduct),
            datasets: [{
              label: 'Unidades Vendidas',
              data: Object.values(salesPerProduct),
              backgroundColor: chartColors,
              borderColor: chartColors.map(color => color + '99'),
              borderWidth: 1
            }]
          },
          options: getChartOptions('Vendas por Produto (Unidades)')
        });
        chartInstances.push(productChart);
      }
    }

    // Event Sales Chart
    if (eventChartRef.current && Object.keys(salesPerEvent).length > 0) {
      const eventCtx = eventChartRef.current.getContext('2d');
      if (eventCtx) {
        const eventChart = new Chart(eventCtx, {
          type: 'pie',
          data: {
            labels: Object.keys(salesPerEvent),
            datasets: [{
              label: 'Nº de Registros de Venda',
              data: Object.values(salesPerEvent),
              backgroundColor: chartColors,
              hoverOffset: 4
            }]
          },
          options: getChartOptions('Registros de Venda por Evento', true)
        });
        chartInstances.push(eventChart);
      }
    }

    // User Sales Chart
    if (userChartRef.current && Object.keys(userSalesData).length > 0) {
      const userCtx = userChartRef.current.getContext('2d');
      if (userCtx) {
        const userChart = new Chart(userCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(userSalesData),
            datasets: [{
              label: 'Total de Unidades Vendidas',
              data: Object.values(userSalesData).map(data => data.totalUnitsSold),
              backgroundColor: chartColors,
              borderColor: chartColors.map(color => color + '99'),
              borderWidth: 1
            }]
          },
          options: getChartOptions('Total de Unidades Vendidas por Usuário')
        });
        chartInstances.push(userChart);
      }
    }
    
    return () => {
      chartInstances.forEach(chart => chart.destroy());
    };
  }, [salesPerProduct, salesPerEvent, userSalesData]); // Dependências não precisam mudar

  const renderChartCanvas = (ref: React.RefObject<HTMLCanvasElement>, data: Record<string, any>, title: string) => (
    <div className="bg-slate-700 p-4 sm:p-6 rounded-lg shadow min-h-[300px] sm:min-h-[400px] flex flex-col">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 text-center sr-only">{title}</h3>
      {Object.keys(data).length > 0 ? (
        <div className="relative flex-grow">
            <canvas ref={ref}></canvas>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-400 text-center">Nenhum dado para exibir no gráfico "{title}".</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-6xl bg-slate-800 p-6 md:p-10 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-white">Relatório Gerencial</h2>
        <button
          onClick={onGoBack}
          className="flex items-center text-sm text-primary-light hover:text-primary transition-colors"
          title="Voltar para Lista de Vendas"
        >
          <ArrowUturnLeftIcon className="h-5 w-5 mr-1" />
          Voltar
        </button>
      </div>

      {/* 4. O dropdown do filtro foi adicionado aqui */}
      <div className="mb-8">
        <label htmlFor="event-filter" className="block text-sm font-medium text-gray-300 mb-2">
          Filtrar por Evento
        </label>
        <select
          id="event-filter"
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full max-w-xs bg-slate-700 border border-slate-600 text-white rounded-lg shadow-sm p-2 focus:ring-primary focus:border-primary"
        >
          <option value="all">Todos os Eventos</option>
          {uniqueEvents.map(event => (
            <option key={event} value={event}>{event}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-700 p-6 rounded-lg shadow text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          Total de Vendas Registradas {selectedEvent !== 'all' ? `(no evento ${selectedEvent})` : ''}
        </h3>
        <p className="text-4xl font-bold text-white">{totalSalesCount}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {renderChartCanvas(productChartRef, salesPerProduct, "Vendas por Produto (Unidades)")}
        {renderChartCanvas(eventChartRef, salesPerEvent, "Vendas por Evento")}
      </div>
      <div className="grid grid-cols-1 gap-6">
        {renderChartCanvas(userChartRef, userSalesData, "Total de Unidades Vendidas por Usuário")}
      </div>
    </div>
  );
};

export default ManagerialDashboard;
