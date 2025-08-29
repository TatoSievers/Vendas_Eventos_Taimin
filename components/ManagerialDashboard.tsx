
import React, { useMemo, useEffect, useRef } from 'react';
import { SalesData } from '../types';
import { ArrowUturnLeftIcon } from './icons';
import { Chart, registerables } from 'chart.js/auto'; // Import from 'chart.js/auto'

Chart.register(...registerables); // Register all necessary components for Chart.js

interface ManagerialDashboardProps {
  sales: SalesData[];
  onGoBack: () => void;
}

interface ProductSummary { [productName: string]: number; }
interface EventSummary { [eventName: string]: number; }
interface UserSalesSummary { [userName: string]: { totalUnitsSold: number; salesCount: number }; }


// Chart.js helper for consistent styling
const getChartOptions = (titleText: string, isPieChart: boolean = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: isPieChart ? 'top' : 'bottom' as const,
      labels: {
        color: '#e5e7eb', // gray-200
        font: { size: 12 }
      }
    },
    title: {
      display: true,
      text: titleText,
      color: '#f9fafb', // gray-50
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
      ticks: { color: '#d1d5db' }, // gray-300
      grid: { color: 'rgba(209, 213, 219, 0.1)' } // gray-300 with alpha
    },
    y: {
      ticks: { color: '#d1d5db' },
      grid: { color: 'rgba(209, 213, 219, 0.1)' },
      beginAtZero: true
    }
  }
});

const chartColors = [
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#60a5fa', // blue-400
  '#f87171', // red-400
  '#a78bfa', // violet-400
  '#22d3ee', // cyan-400
  '#f472b6', // pink-400
  '#84cc16', // lime-500
];


const ManagerialDashboard: React.FC<ManagerialDashboardProps> = ({ sales, onGoBack }) => {
  const totalSalesCount = sales.length;

  const salesPerProduct = useMemo<ProductSummary>(() => {
    const summary: ProductSummary = {};
    sales.forEach(sale => {
      sale.produtos.forEach(item => {
        summary[item.nomeProduto] = (summary[item.nomeProduto] || 0) + item.unidades;
      });
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b - a));
  }, [sales]);

  const salesPerEvent = useMemo<EventSummary>(() => {
    const summary: EventSummary = {};
    sales.forEach(sale => {
      summary[sale.nomeEvento] = (summary[sale.nomeEvento] || 0) + 1; // Counts number of sales per event
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b - a));
  }, [sales]);

  const userSalesData = useMemo<UserSalesSummary>(() => {
    const summary: UserSalesSummary = {};
    sales.forEach(sale => {
      const userName = sale.nomeUsuario;
      if (!summary[userName]) {
        summary[userName] = { totalUnitsSold: 0, salesCount: 0 };
      }
      summary[userName].salesCount += 1;
      sale.produtos.forEach(item => {
        summary[userName].totalUnitsSold += item.unidades;
      });
    });
    // Sort by total units sold in descending order
    return Object.fromEntries(
        Object.entries(summary).sort(([, a], [, b]) => b.totalUnitsSold - a.totalUnitsSold)
    );
  }, [sales]);

  const productChartRef = useRef<HTMLCanvasElement>(null);
  const eventChartRef = useRef<HTMLCanvasElement>(null);
  const userChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const chartInstances: Chart[] = [];
    
    // Product Sales Chart (Bar)
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

    // Event Sales Chart (Pie)
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

    // User Sales Chart (Bar) - Based on Total Units Sold
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
    
    return () => { // Cleanup function
      chartInstances.forEach(chart => chart.destroy());
    };
  }, [salesPerProduct, salesPerEvent, userSalesData]);

  const renderChartCanvas = (ref: React.RefObject<HTMLCanvasElement>, data: Record<string, any>, title: string, isUserData: boolean = false) => (
    <div className="bg-slate-700 p-4 sm:p-6 rounded-lg shadow min-h-[300px] sm:min-h-[400px] flex flex-col">
       <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 text-center sr-only">{title}</h3> {/* Title managed by Chart.js options */}
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
      <div className="flex justify-between items-center mb-8">
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

      <div className="bg-slate-700 p-6 rounded-lg shadow text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Total de Vendas Registradas</h3>
        <p className="text-4xl font-bold text-white">{totalSalesCount}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {renderChartCanvas(productChartRef, salesPerProduct, "Vendas por Produto (Unidades)")}
        {renderChartCanvas(eventChartRef, salesPerEvent, "Vendas por Evento")}
      </div>
       <div className="grid grid-cols-1 gap-6">
        {renderChartCanvas(userChartRef, userSalesData, "Total de Unidades Vendidas por Usuário", true)}
      </div>
    </div>
  );
};

export default ManagerialDashboard;
