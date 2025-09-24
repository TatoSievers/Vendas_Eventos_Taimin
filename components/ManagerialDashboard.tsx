

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { SalesData, EventDetail, UserDetail } from '../types';
import { ArrowUturnLeftIcon, DownloadIcon, ChevronDownIcon, UserIcon, CubeIcon, CreditCardIcon, MapPinIcon, CalendarDaysIcon } from './icons';
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
interface EventSummary { [eventName: string]: { salesCount: number; unitsSold: number }; }
interface UserSalesSummary { [userName: string]: { totalUnitsSold: number; salesCount: number }; }


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
      if (!summary[sale.nomeEvento]) summary[sale.nomeEvento] = { salesCount: 0, unitsSold: 0 };
      summary[sale.nomeEvento].salesCount += 1;
      summary[sale.nomeEvento].unitsSold += sale.produtos.reduce((sum, p) => sum + p.unidades, 0);
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => (b as EventSummary[string]).salesCount - (a as EventSummary[string]).salesCount));
  }, [filteredSales]);

  const userSalesData = useMemo<UserSalesSummary>(() => {
    const summary: UserSalesSummary = {};
    filteredSales.forEach(sale => {
      if (!summary[sale.nomeUsuario]) summary[sale.nomeUsuario] = { totalUnitsSold: 0, salesCount: 0 };
      summary[sale.nomeUsuario].salesCount += 1;
      summary[sale.nomeUsuario].totalUnitsSold += sale.produtos.reduce((sum, p) => sum + p.unidades, 0);
    });
    return Object.fromEntries(Object.entries(summary).sort(([, a], [, b]) => (b as UserSalesSummary[string]).totalUnitsSold - (a as UserSalesSummary[string]).totalUnitsSold));
  }, [filteredSales]);

  const productChartRef = useRef<HTMLCanvasElement>(null);
  const eventChartRef = useRef<HTMLCanvasElement>(null);

  const formatDate = (dateString: string | undefined, includeTime = false) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (includeTime) {
      return date.toLocaleString('pt-BR', { timeZone: 'UTC' });
    }
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatTelefone = (ddd: string | undefined, numero: string | undefined) => {
    if (!ddd && !numero) return 'N/A';
    return `(${ddd || ''}) ${numero || ''}`.trim();
  };

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
            ['Total de Vendas Registradas', totalSalesCount.toString()],
            ['Total de Unidades Vendidas', totalUnitsSold.toString()],
            ['Média de Unidades por Venda', (totalUnitsSold / totalSalesCount || 0).toFixed(2)],
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
        const formatDatePdf = (dateStr: string) => new Date(dateStr).toLocaleString('pt-BR', { timeZone: 'UTC' });
        const formatDateOnlyPdf = (dateStr: string) => {
            if (!dateStr) return 'N/A';
            const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        };
        
        eventNamesForPdf.forEach((eventName) => {
            if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
            
            doc.setFontSize(14);
            doc.setTextColor(8, 145, 178);
            doc.text(`Evento: ${eventName}`, margin, yPos);
            yPos += 8;

            const eventSales = filteredSales.filter(s => s.nomeEvento === eventName);
            eventSales.forEach(sale => {
                const saleDataForPdf = [
                    ['ID da Venda', sale.id],
                    ['Data do Registro', formatDatePdf(sale.created_at)],
                    ['Data do Evento', formatDateOnlyPdf(sale.dataEvento)],
                    ['Vendedor(a)', sale.nomeUsuario],
                    ['Cliente', `${sale.primeiroNome} ${sale.sobrenome}`],
                    ['CPF', sale.cpf],
                    ['E-mail', sale.email],
                    ['Telefone', `(${sale.ddd}) ${sale.telefoneNumero}`],
                    ['Endereço', `${sale.logradouroRua}, ${sale.numeroEndereco}`],
                    ['Complemento', sale.complemento || '-'],
                    ['Bairro', sale.bairro],
                    ['Cidade/Estado', `${sale.cidade}/${sale.estado}`],
                    ['CEP', sale.cep],
                    ['Forma de Pagamento', sale.formaPagamento],
                    ['Produtos', sale.produtos.map(p => `${p.nomeProduto} (${p.unidades} unid.)`).join('; ')],
                ];

                if (sale.observacao) {
                    saleDataForPdf.push(['Observação', sale.observacao]);
                }

                // Estimate height and check for page break
                const rowHeight = 7; // Approx height per row in mm
                const headerHeight = 10;
                const bottomMargin = 10;
                const tableHeight = headerHeight + (saleDataForPdf.length * rowHeight) + bottomMargin;

                if (yPos + tableHeight > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                
                (doc as any).autoTable({
                    startY: yPos,
                    head: [[{ 
                        content: `Registro de Venda - Cliente: ${sale.primeiroNome} ${sale.sobrenome}`, 
                        colSpan: 2, 
                        styles: { halign: 'left', fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } 
                    }]],
                    body: saleDataForPdf,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] },
                        1: { cellWidth: 'auto' }
                    },
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
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
                              {(data as UserSalesSummary[string]).totalUnitsSold} unid. / {(data as UserSalesSummary[string]).salesCount} vendas
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
                            <span className="font-semibold">{eventName} ({salesPerEvent[eventName].salesCount} vendas)</span>
                            <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180"/>
                        </summary>
                        <div className="border-t border-slate-500 p-4 space-y-4">
                            {filteredSales.filter(s => s.nomeEvento === eventName).map(sale => (
                                <div key={sale.id} className="bg-slate-700/80 p-4 rounded-md text-sm">
                                  <div className="flex justify-between items-start gap-4">
                                      <p className="font-bold text-white text-base">{sale.primeiroNome} {sale.sobrenome}</p>
                                      <span className="text-xs text-gray-400 text-right flex-shrink-0">{formatDate(sale.created_at, true)}</span>
                                  </div>
                                  <div className="text-gray-300 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                      <div>
                                          <p><strong>CPF:</strong> {sale.cpf}</p>
                                          <p><strong>Email:</strong> {sale.email}</p>
                                          <p><strong>Telefone:</strong> {formatTelefone(sale.ddd, sale.telefoneNumero)}</p>
                                      </div>
                                      <div>
                                          <p className="flex items-center"><UserIcon className="h-4 w-4 mr-2 text-cyan-400"/> {sale.nomeUsuario}</p>
                                          <p className="flex items-center"><CreditCardIcon className="h-4 w-4 mr-2 text-cyan-400"/> {sale.formaPagamento}</p>
                                          <p className="flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-2 text-cyan-400"/> Evento em: {formatDate(sale.dataEvento)}</p>
                                      </div>
                                      <div className="sm:col-span-2 mt-2">
                                          <p className="flex items-start"><MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-cyan-400 flex-shrink-0"/>
                                          {sale.logradouroRua}, {sale.numeroEndereco} {sale.complemento ? `(${sale.complemento})` : ''} - {sale.bairro}, {sale.cidade}/{sale.estado} - {sale.cep}
                                          </p>
                                      </div>
                                      <div className="sm:col-span-2 mt-2">
                                          <p className="flex items-start font-semibold text-white mb-1"><CubeIcon className="h-4 w-4 mr-2 mt-0.5"/> Produtos</p>
                                          <ul className="list-disc list-inside ml-2 text-gray-300">
                                              {sale.produtos.map(p => (
                                              <li key={p.nomeProduto}>{p.nomeProduto} ({p.unidades} unid.)</li>
                                              ))}
                                          </ul>
                                      </div>
                                      {sale.observacao && (
                                          <div className="sm:col-span-2 mt-2 pt-2 border-t border-slate-600">
                                              <p><strong>Observação:</strong> {sale.observacao}</p>
                                          </div>
                                      )}
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