

import React, { useMemo, useEffect, useRef } from 'react';
import { SalesData } from '../types';
import { ArrowUturnLeftIcon, DownloadIcon } from './icons';
import { Chart, registerables } from 'chart.js/auto';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

Chart.register(...registerables);

interface ManagerialDashboardProps {
  sales: SalesData[];
  onGoBack: () => void;
}

interface ProductSummary { [productName: string]: number; }
interface EventSummary { [eventName: string]: { salesCount: number; unitsSold: number }; }
interface UserSalesSummary { [userName: string]: { totalUnitsSold: number; salesCount: number }; }


const getChartOptions = (titleText: string, isPieChart: boolean = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    // FIX: Add 'as const' to both ternary branches to ensure correct type for legend position.
    legend: { position: isPieChart ? 'top' as const : 'bottom' as const, labels: { color: '#e5e7eb', font: { size: 12 }}},
    title: { display: true, text: titleText, color: '#f9fafb', font: { size: 16, weight: 'bold' as const }},
    tooltip: { backgroundColor: 'rgba(0,0,0,0.7)', titleColor: '#ffffff', bodyColor: '#ffffff' }
  },
  scales: isPieChart ? {} : {
    x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(209, 213, 219, 0.1)' }},
    y: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(209, 213, 219, 0.1)' }, beginAtZero: true }
  }
});

const chartColors = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#22d3ee', '#f472b6', '#84cc16'];

const StatCard: React.FC<{title: string; value: string | number;}> = ({ title, value }) => (
    <div className="bg-slate-700 p-6 rounded-lg shadow text-center">
        <h3 className="text-md font-semibold text-gray-300 mb-2 truncate">{title}</h3>
        <p className="text-3xl font-bold text-white">{value}</p>
    </div>
);


const ManagerialDashboard: React.FC<ManagerialDashboardProps> = ({ sales, onGoBack }) => {
  const totalSalesCount = sales.length;
  const totalUnitsSold = useMemo(() => sales.reduce((sum, sale) => sum + sale.produtos.reduce((pSum, p) => pSum + p.unidades, 0), 0), [sales]);

  const salesPerProduct = useMemo<ProductSummary>(() => {
    const summary: ProductSummary = {};
    sales.forEach(sale => sale.produtos.forEach(item => {
      summary[item.nomeProduto] = (summary[item.nomeProduto] || 0) + item.unidades;
    }));
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b - a));
  }, [sales]);
  
  const topProduct = Object.keys(salesPerProduct)[0] || 'N/A';

  const salesPerEvent = useMemo<EventSummary>(() => {
    const summary: EventSummary = {};
    sales.forEach(sale => {
      if (!summary[sale.nomeEvento]) summary[sale.nomeEvento] = { salesCount: 0, unitsSold: 0 };
      summary[sale.nomeEvento].salesCount += 1;
      summary[sale.nomeEvento].unitsSold += sale.produtos.reduce((sum, p) => sum + p.unidades, 0);
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b.salesCount - a.salesCount));
  }, [sales]);

  const userSalesData = useMemo<UserSalesSummary>(() => {
    const summary: UserSalesSummary = {};
    sales.forEach(sale => {
      if (!summary[sale.nomeUsuario]) summary[sale.nomeUsuario] = { totalUnitsSold: 0, salesCount: 0 };
      summary[sale.nomeUsuario].salesCount += 1;
      summary[sale.nomeUsuario].totalUnitsSold += sale.produtos.reduce((sum, p) => sum + p.unidades, 0);
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b.totalUnitsSold - a.totalUnitsSold));
  }, [sales]);

  const productChartRef = useRef<HTMLCanvasElement>(null);
  const eventChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const chartInstances: Chart[] = [];
    
    if (productChartRef.current && Object.keys(salesPerProduct).length > 0) {
      const productCtx = productChartRef.current.getContext('2d');
      if (productCtx) {
        const top5Products = Object.entries(salesPerProduct).slice(0, 5);
        const chart = new Chart(productCtx, {
          type: 'bar',
          data: {
            labels: top5Products.map(p => p[0]),
            datasets: [{ label: 'Unidades Vendidas', data: top5Products.map(p => p[1]), backgroundColor: chartColors }]
          },
          options: getChartOptions('Top 5 Produtos (Unidades Vendidas)')
        });
        chartInstances.push(chart);
      }
    }

    if (eventChartRef.current && Object.keys(salesPerEvent).length > 0) {
      const eventCtx = eventChartRef.current.getContext('2d');
      if (eventCtx) {
        const chart = new Chart(eventCtx, {
          type: 'pie',
          data: {
            labels: Object.keys(salesPerEvent),
            datasets: [{ label: 'Nº de Vendas', data: Object.values(salesPerEvent).map(e => e.salesCount), backgroundColor: chartColors, hoverOffset: 4 }]
          },
          options: getChartOptions('Vendas por Evento', true)
        });
        chartInstances.push(chart);
      }
    }
    
    return () => { chartInstances.forEach(chart => chart.destroy()); };
  }, [salesPerProduct, salesPerEvent]);


  const handleDownloadManagerialPdf = async () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Helper para Título
    const addTitle = (title: string) => {
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.text(title, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
    };
    
    // Helper para Cabeçalho e Rodapé
    const addHeaderFooter = () => {
        for (let i = 1; i <= doc.getNumberOfPages(); i++) {
            doc.setPage(i);
            // Cabeçalho
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('Relatório Gerencial - Vendas Taimin', 10, 10);
            // Rodapé
            doc.text(`Página ${i}`, pageWidth - 15, doc.internal.pageSize.getHeight() - 10);
        }
    };
    
    // --- Página 1: Capa e KPIs ---
    addTitle('Relatório Gerencial de Vendas');
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    (doc as any).autoTable({
        startY: yPos,
        head: [['Indicador', 'Valor']],
        body: [
            ['Total de Vendas Registradas', totalSalesCount],
            ['Total de Unidades Vendidas', totalUnitsSold],
            ['Média de Unidades por Venda', (totalUnitsSold / totalSalesCount || 0).toFixed(2)],
            ['Produto Mais Vendido', topProduct],
        ],
        theme: 'grid',
        headStyles: { fillColor: [8, 145, 178] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // --- Gráficos ---
    const addChartToPdf = (chartRef: React.RefObject<HTMLCanvasElement>, title: string) => {
        if (chartRef.current) {
            if (yPos + 80 > doc.internal.pageSize.getHeight()) { doc.addPage(); yPos = 20; }
            doc.setFontSize(16);
            doc.text(title, 14, yPos);
            yPos += 10;
            const imgData = chartRef.current.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 14, yPos, 180, 90);
            yPos += 100;
        }
    }
    
    doc.addPage();
    yPos = 20;
    addChartToPdf(productChartRef, 'Top 5 Produtos Mais Vendidos');
    addChartToPdf(eventChartRef, 'Distribuição de Vendas por Evento');

    // --- Tabelas Detalhadas ---
    const addDetailedTable = (title: string, head: any[], body: any[]) => {
        if (yPos + 40 > doc.internal.pageSize.getHeight()) { doc.addPage(); yPos = 20; }
        doc.setFontSize(16);
        doc.text(title, 14, yPos);
        yPos += 10;
        (doc as any).autoTable({ startY: yPos, head, body, theme: 'striped', headStyles: { fillColor: [8, 145, 178] }});
        yPos = (doc as any).lastAutoTable.finalY + 15;
    };
    
    addDetailedTable(
        'Desempenho por Usuário',
        [['Usuário', 'Vendas Realizadas', 'Unidades Vendidas']],
        Object.entries(userSalesData).map(([name, data]) => [name, data.salesCount, data.totalUnitsSold])
    );
    addDetailedTable(
        'Resumo de Vendas por Evento',
        [['Evento', 'Nº de Vendas', 'Unidades Vendidas']],
        Object.entries(salesPerEvent).map(([name, data]) => [name, data.salesCount, data.unitsSold])
    );
    
    addHeaderFooter();
    doc.save('Relatorio_Gerencial_Vendas_Taimin.pdf');
  };

  return (
    <div className="w-full max-w-6xl bg-slate-800 p-6 md:p-10 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-semibold text-white">Relatório Gerencial</h2>
        <div>
            <button onClick={handleDownloadManagerialPdf} className="flex items-center text-sm bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md shadow-md mr-4">
                <DownloadIcon className="h-5 w-5 mr-2"/>
                Baixar Relatório PDF
            </button>
            <button onClick={onGoBack} className="flex items-center text-sm text-primary-light hover:text-primary transition-colors">
                <ArrowUturnLeftIcon className="h-5 w-5 mr-1" /> Voltar
            </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total de Vendas" value={totalSalesCount} />
        <StatCard title="Unidades Vendidas" value={totalUnitsSold} />
        <StatCard title="Produto Mais Vendido" value={topProduct} />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-700 p-4 sm:p-6 rounded-lg shadow min-h-[400px]"><canvas ref={productChartRef}></canvas></div>
        <div className="bg-slate-700 p-4 sm:p-6 rounded-lg shadow min-h-[400px]"><canvas ref={eventChartRef}></canvas></div>
      </div>
      
      {/* Data Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-slate-700 p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-white mb-4">Top 5 Produtos</h3>
              <ul className="space-y-2 text-gray-300">
                  {Object.entries(salesPerProduct).slice(0, 5).map(([name, units], i) => (
                      <li key={name} className="flex justify-between items-center p-2 rounded bg-slate-600/50">
                          <span>{i + 1}. {name}</span>
                          <span className="font-bold text-white">{units} unid.</span>
                      </li>
                  ))}
              </ul>
          </div>
          <div className="bg-slate-700 p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-white mb-4">Desempenho por Usuário</h3>
              <ul className="space-y-2 text-gray-300">
                  {Object.entries(userSalesData).map(([name, data]) => (
                      <li key={name} className="flex justify-between items-center p-2 rounded bg-slate-600/50">
                           <span>{name}</span>
                          <span className="text-right">
                              {data.totalUnitsSold} unid. / {data.salesCount} vendas
                          </span>
                      </li>
                  ))}
              </ul>
          </div>
      </div>
    </div>
  );
};

export default ManagerialDashboard;
