import React, { useMemo, useEffect, useRef, useState } from 'react';
import { SalesData, EventDetail, UserDetail } from '../types';
import { ArrowUturnLeftIcon, DownloadIcon, ChevronDownIcon, UserIcon, CubeIcon, CreditCardIcon } from './icons';
import { Chart, registerables } from 'chart.js/auto';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

Chart.register(...registerables);

interface ManagerialDashboardProps {
  allSales: SalesData[];
  initialFilterEvent: string;
  initialFilterUser: string;
  uniqueEvents: EventDetail[];
  uniqueUsers: UserDetail[];
  onGoBack: () => void;
}

interface ProductSummary { [productName: string]: number; }
interface EventSummary { [eventName: string]: { salesCount: number; unitsSold: number; totalValue: number; }; }
interface UserSalesSummary { [userName: string]: { totalUnitsSold: number; salesCount: number; totalValue: number; }; }


const getChartOptions = (titleText: string, isPieChart: boolean = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
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
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const StatCard: React.FC<{title: string; value: string | number;}> = ({ title, value }) => (
    <div className="bg-slate-700 p-6 rounded-lg shadow text-center">
        <h3 className="text-md font-semibold text-gray-300 mb-2 truncate">{title}</h3>
        <p className="text-3xl font-bold text-white">{value}</p>
    </div>
);


const ManagerialDashboard: React.FC<ManagerialDashboardProps> = ({ allSales, initialFilterEvent, initialFilterUser, uniqueEvents, uniqueUsers, onGoBack }) => {
  const [filterEvent, setFilterEvent] = useState(initialFilterEvent);
  const [filterUser, setFilterUser] = useState(initialFilterUser);

  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      const matchesEvent = filterEvent ? sale.nomeEvento === filterEvent : true;
      const matchesUser = filterUser ? sale.nomeUsuario === filterUser : true;
      return matchesEvent && matchesUser;
    });
  }, [allSales, filterEvent, filterUser]);

  const totalSalesCount = filteredSales.length;
  const totalUnitsSold = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.produtos.reduce((pSum, p) => pSum + p.unidades, 0), 0), [filteredSales]);
  const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.valorTotal, 0), [filteredSales]);

  const salesPerProduct = useMemo<ProductSummary>(() => {
    const summary: ProductSummary = {};
    filteredSales.forEach(sale => sale.produtos.forEach(item => {
      summary[item.nomeProduto] = (summary[item.nomeProduto] || 0) + item.unidades;
    }));
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => b - a));
  }, [filteredSales]);
  
  const topProduct = Object.keys(salesPerProduct)[0] || 'N/A';

  const salesPerEvent = useMemo<EventSummary>(() => {
    const summary: EventSummary = {};
    filteredSales.forEach(sale => {
      if (!summary[sale.nomeEvento]) summary[sale.nomeEvento] = { salesCount: 0, unitsSold: 0, totalValue: 0 };
      summary[sale.nomeEvento].salesCount += 1;
      summary[sale.nomeEvento].unitsSold += sale.produtos.reduce((sum, p) => sum + p.unidades, 0);
      summary[sale.nomeEvento].totalValue += sale.valorTotal;
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => (b as EventSummary[string]).salesCount - (a as EventSummary[string]).salesCount));
  }, [filteredSales]);

  const userSalesData = useMemo<UserSalesSummary>(() => {
    const summary: UserSalesSummary = {};
    filteredSales.forEach(sale => {
      if (!summary[sale.nomeUsuario]) summary[sale.nomeUsuario] = { totalUnitsSold: 0, salesCount: 0, totalValue: 0 };
      summary[sale.nomeUsuario].salesCount += 1;
      summary[sale.nomeUsuario].totalUnitsSold += sale.produtos.reduce((sum, p) => sum + p.unidades, 0);
      summary[sale.nomeUsuario].totalValue += sale.valorTotal;
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => (b as UserSalesSummary[string]).totalValue - (a as UserSalesSummary[string]).totalValue));
  }, [filteredSales]);

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
            datasets: [{ label: 'Nº de Vendas', data: Object.values(salesPerEvent).map((e: { salesCount: number }) => e.salesCount), backgroundColor: chartColors, hoverOffset: 4 }]
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    const addHeaderFooter = () => {
        for (let i = 1; i <= doc.getNumberOfPages(); i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text('Relatório Gerencial - Vendas Taimin', margin, 10);
            doc.text(`Página ${i} de ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
    };

    // --- PAGE 1: SUMMARY ---
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('Relatório Gerencial de Vendas', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    
    if (filterEvent || filterUser) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Filtros Aplicados: ${filterEvent ? `Evento: ${filterEvent}`: ''} ${filterUser ? `Usuário: ${filterUser}`: ''}`, pageWidth / 2, yPos, { align: 'center' });
    }
    yPos += 12;

    (doc as any).autoTable({
        startY: yPos,
        head: [['Indicador', 'Valor']],
        body: [
            ['Faturamento Total', formatCurrency(totalRevenue)],
            ['Total de Vendas Registradas', totalSalesCount.toString()],
            ['Total de Unidades Vendidas', totalUnitsSold.toString()],
            ['Ticket Médio por Venda', formatCurrency(totalRevenue / totalSalesCount || 0)],
            ['Produto Mais Vendido', topProduct],
        ],
        theme: 'grid',
        headStyles: { fillColor: [8, 145, 178] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // --- PAGE 2: CHARTS ---
    doc.addPage();
    yPos = margin;
    doc.setFontSize(16);
    doc.text('Visualização de Dados', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    const addChartToPdf = (chartRef: React.RefObject<HTMLCanvasElement>) => {
        if (chartRef.current) {
            if (yPos + 80 > pageHeight) { doc.addPage(); yPos = margin; }
            const imgData = chartRef.current.toDataURL('image/png', 1.0);
            doc.addImage(imgData, 'PNG', margin, yPos, pageWidth - (margin * 2), 100);
            yPos += 110;
        }
    }
    
    if (productChartRef.current && Object.keys(salesPerProduct).length > 0) addChartToPdf(productChartRef);
    if (eventChartRef.current && Object.keys(salesPerEvent).length > 0) addChartToPdf(eventChartRef);

    // --- SUBSEQUENT PAGES: DETAILED SALES ---
    doc.addPage();
    yPos = margin;
    doc.setFontSize(16);
    doc.text('Detalhamento de Todas as Vendas', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    const eventNamesForPdf = Object.keys(salesPerEvent);
    if(eventNamesForPdf.length > 0) {
        eventNamesForPdf.forEach((eventName) => {
            if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
            
            doc.setFontSize(14);
            doc.setTextColor(8, 145, 178);
            doc.text(`Evento: ${eventName}`, margin, yPos);
            yPos += 8;

            const eventSales = filteredSales.filter(s => s.nomeEvento === eventName);
            eventSales.forEach(sale => {
                const saleBlockHeight = 65 + (sale.produtos.length * 5); 
                if (yPos + saleBlockHeight > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }

                doc.setDrawColor(200);
                doc.line(margin, yPos, pageWidth - margin, yPos); // Separator line
                yPos += 6;

                doc.setFontSize(10);
                doc.setTextColor(100);
                
                const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('pt-BR');
                const formatAddress = (s: SalesData) => `${s.logradouroRua}, ${s.numeroEndereco} ${s.complemento ? `(${s.complemento})` : ''} - ${s.bairro}, ${s.cidade}/${s.estado} - CEP: ${s.cep}`;
                
                (doc as any).autoTable({
                    startY: yPos,
                    theme: 'plain',
                    body: [
                        [{ content: `Cliente: ${sale.primeiroNome} ${sale.sobrenome} | Total: ${formatCurrency(sale.valorTotal)}`, styles: { fontStyle: 'bold', textColor: 40 } }],
                        [{ content: `Data da Venda: ${formatDate(sale.created_at)}` }],
                        [{ content: `Contato: ${sale.email} | (${sale.ddd}) ${sale.telefoneNumero}` }],
                        [{ content: `Endereço: ${formatAddress(sale)}` }],
                        [{ content: `Vendedor: ${sale.nomeUsuario} | Pagamento: ${sale.formaPagamento}` }],
                        [{ content: `Produtos: ${sale.produtos.map(p => `${p.nomeProduto} (${p.unidades})`).join(', ')}`, styles: { cellWidth: 'wrap' } }],
                        sale.observacao ? [{ content: `Observações: ${sale.observacao}` }] : [],
                    ],
                    styles: { fontSize: 9, cellPadding: 1 },
                    columnStyles: { 0: { cellWidth: pageWidth - (margin * 2) } }
                });
                yPos = (doc as any).lastAutoTable.finalY + 5;
            });
            yPos += 5; // Extra space after each event group
        });
    } else {
        doc.text('Nenhuma venda encontrada para os filtros selecionados.', pageWidth / 2, yPos, { align: 'center' });
    }
    
    addHeaderFooter();
    doc.save('Relatorio_Gerencial_Completo_Taimin.pdf');
  };

  const eventNames = useMemo(() => Object.keys(salesPerEvent), [salesPerEvent]);

  return (
    <div className="w-full max-w-6xl bg-slate-800 p-6 md:p-10 rounded-xl shadow-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-semibold text-white text-center sm:text-left">Relatório Gerencial</h2>
        <div className="flex items-center">
            <button onClick={handleDownloadManagerialPdf} className="flex items-center text-sm bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md shadow-md mr-4">
                <DownloadIcon className="h-5 w-5 mr-2"/>
                Baixar Relatório PDF
            </button>
            <button onClick={onGoBack} className="flex items-center text-sm text-primary-light hover:text-primary transition-colors">
                <ArrowUturnLeftIcon className="h-5 w-5 mr-1" /> Voltar
            </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-slate-700/50 rounded-lg">
        <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:ring-primary focus:border-primary">
          <option value="">Todos os Eventos</option>
          {uniqueEvents.map(event => <option key={event.name} value={event.name}>{event.name}</option>)}
        </select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:ring-primary focus:border-primary">
          <option value="">Todos os Usuários</option>
          {uniqueUsers.map(user => <option key={user.name} value={user.name}>{user.name}</option>)}
        </select>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Faturamento Total" value={formatCurrency(totalRevenue)} />
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
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
                              {formatCurrency((data as UserSalesSummary[string]).totalValue)} / {(data as UserSalesSummary[string]).salesCount} vendas
                          </span>
                      </li>
                  ))}
              </ul>
          </div>
      </div>

       {/* Detalhamento por Evento */}
       <div className="bg-slate-700 p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-white mb-4">Detalhamento de Vendas por Evento</h3>
            <div className="space-y-2">
                {eventNames.length > 0 ? eventNames.map(eventName => (
                    <details key={eventName} className="group bg-slate-600/50 rounded-lg">
                        <summary className="p-3 cursor-pointer text-cyan-300 hover:bg-slate-600 flex justify-between items-center rounded-lg transition-colors">
                            <span className="font-semibold">{eventName} ({salesPerEvent[eventName].salesCount} vendas | {formatCurrency(salesPerEvent[eventName].totalValue)})</span>
                            <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180"/>
                        </summary>
                        <div className="border-t border-slate-500 p-4 space-y-4">
                            {filteredSales.filter(s => s.nomeEvento === eventName).map(sale => (
                                <div key={sale.id} className="bg-slate-700/80 p-3 rounded-md text-sm">
                                    <p className="font-bold text-white flex justify-between">
                                        <span>{sale.primeiroNome} {sale.sobrenome}</span>
                                        <span>{formatCurrency(sale.valorTotal)}</span>
                                    </p>
                                    <div className="text-gray-300 mt-2 space-y-1">
                                      <p className="flex items-center"><CubeIcon className="h-4 w-4 mr-2 text-cyan-400"/> {sale.produtos.map(p => `${p.nomeProduto} (${p.unidades})`).join(', ')}</p>
                                      <p className="flex items-center"><CreditCardIcon className="h-4 w-4 mr-2 text-cyan-400"/> {sale.formaPagamento}</p>
                                      <p className="flex items-center"><UserIcon className="h-4 w-4 mr-2 text-cyan-400"/> Vendedor(a): {sale.nomeUsuario}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                )) : <p className="text-gray-400 text-center py-4">Nenhum evento encontrado para os filtros selecionados.</p>}
            </div>
       </div>
    </div>
  );
};

export default ManagerialDashboard;