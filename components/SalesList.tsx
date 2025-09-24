

import React, { useMemo } from 'react';
import { SalesData } from '../types';
import { 
    DownloadIcon, 
    ChartBarIcon, 
    PencilIcon, 
    TrashIcon, 
    UserIcon,
    TagIcon,
    CalendarDaysIcon,
    CubeIcon,
    CreditCardIcon,
    ChevronDownIcon,
    MapPinIcon
} from './icons';
import * as XLSX from 'xlsx';

interface SalesListProps {
  sales: SalesData[];
  allSalesForFilters: SalesData[];
  onNavigateToDashboard: () => void;
  onEditSale: (saleId: string) => void;
  onDeleteSale: (saleId: string) => void;
  onDeleteEvent: (eventName: string) => void;
  onNotify: (message: { type: 'success' | 'error' | 'info'; text: string; }) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterEvent: string;
  setFilterEvent: (event: string) => void;
  filterUser: string;
  setFilterUser: (user: string) => void;
}

const SalesList: React.FC<SalesListProps> = ({ 
    sales, 
    allSalesForFilters,
    onNavigateToDashboard, 
    onEditSale, 
    onDeleteSale, 
    onDeleteEvent,
    onNotify,
    searchTerm,
    setSearchTerm,
    filterEvent,
    setFilterEvent,
    filterUser,
    setFilterUser
}) => {
  
  const uniqueEvents = useMemo(() => Array.from(new Set(allSalesForFilters.map(s => s.nomeEvento))).sort(), [allSalesForFilters]);
  const uniqueUsers = useMemo(() => Array.from(new Set(allSalesForFilters.map(s => s.nomeUsuario))).sort(), [allSalesForFilters]);
  
  const formatDate = (dateString: string | undefined, includeTime = false) => {
    if (!dateString) return 'N/A';
    // Handle full ISO strings (from created_at) and date-only strings (from dataEvento)
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

  const handleDownloadExcel = () => {
    if (sales.length === 0) {
      onNotify({ type: 'info', text: "Não há dados para exportar (com os filtros atuais)." });
      return;
    }
    const dataForExcel = sales.map(sale => {
        const productString = sale.produtos.map(p => `${p.nomeProduto} (${p.unidades} unid.)`).join('; ');
        return {
            'ID': sale.id,
            'Data Criação': new Date(sale.created_at).toLocaleString('pt-BR'),
            'Usuário': sale.nomeUsuario,
            'Evento': sale.nomeEvento,
            'Data Evento': formatDate(sale.dataEvento),
            'Primeiro Nome': sale.primeiroNome,
            'Sobrenome': sale.sobrenome,
            'CPF': sale.cpf,
            'Email': sale.email,
            'Telefone': formatTelefone(sale.ddd, sale.telefoneNumero),
            'Endereço': `${sale.logradouroRua}, ${sale.numeroEndereco}`,
            'Complemento': sale.complemento || '-',
            'Bairro': sale.bairro,
            'Cidade': sale.cidade,
            'Estado': sale.estado,
            'CEP': sale.cep,
            'Forma de Pagamento': sale.formaPagamento,
            'Produtos': productString,
            'Observação': sale.observacao || '-',
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");
    const colsWidth = Object.keys(dataForExcel[0] || {}).map(key => ({ wch: Math.max(key.length, 20) }));
    worksheet["!cols"] = colsWidth;
    XLSX.writeFile(workbook, "Vendas_Taimin_Filtrado.xlsx");
  };

  if (allSalesForFilters.length === 0) {
    return (
      <div className="w-full max-w-4xl bg-slate-800 p-8 rounded-xl shadow-2xl text-center">
        <h2 className="text-3xl font-semibold text-white mb-6">Registros de Vendas</h2>
        <p className="text-gray-400">Nenhuma venda registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl bg-slate-800 p-4 md:p-8 rounded-xl shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-semibold text-white text-center md:text-left">Registros de Vendas</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadExcel}
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-md shadow-md flex items-center justify-center space-x-2"
          >
            <DownloadIcon className="h-5 w-5" />
            <span>Baixar Excel</span>
          </button>
          <button
            onClick={onNavigateToDashboard}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-md flex items-center justify-center space-x-2"
          >
            <ChartBarIcon className="h-5 w-5" />
            <span>Relatório Gerencial</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-slate-700/50 rounded-lg">
        <input
          type="text"
          placeholder="Buscar por cliente, CPF ou evento..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:ring-primary focus:border-primary"
        />
        <div className="flex items-center gap-2">
            <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:ring-primary focus:border-primary">
              <option value="">Todos os Eventos</option>
              {uniqueEvents.map(event => <option key={event} value={event}>{event}</option>)}
            </select>
            {filterEvent && (
              <button onClick={() => onDeleteEvent(filterEvent)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md shrink-0" title={`Apagar evento ${filterEvent} e todas as suas vendas`}>
                  <TrashIcon className="h-5 w-5" />
              </button>
            )}
        </div>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:ring-primary focus:border-primary">
          <option value="">Todos os Usuários</option>
          {uniqueUsers.map(user => <option key={user} value={user}>{user}</option>)}
        </select>
      </div>

      {/* Lista de Vendas em Cards */}
      {sales.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sales.map(sale => (
            <div key={sale.id} className="bg-slate-700 rounded-lg shadow-lg flex flex-col transition-all duration-300 hover:shadow-primary/20 hover:ring-1 hover:ring-primary-dark">
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-white mb-2">{sale.primeiroNome} {sale.sobrenome}</h3>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => onEditSale(sale.id)} className="text-primary-light hover:text-primary p-1 rounded hover:bg-slate-600" title="Editar"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => onDeleteSale(sale.id)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-600" title="Excluir"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </div>
                
                <p className="text-xs text-gray-400 mb-3">Registrado em: {formatDate(sale.created_at, true)}</p>

                <div className="space-y-3 text-sm text-gray-300">
                    <p className="flex items-center"><TagIcon className="h-4 w-4 mr-2 text-cyan-400"/> {sale.nomeEvento}</p>
                    <p className="flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-2 text-cyan-400"/> {formatDate(sale.dataEvento)}</p>
                    <p className="flex items-center"><UserIcon className="h-4 w-4 mr-2 text-cyan-400"/> Vendedor(a): {sale.nomeUsuario}</p>
                    <p className="flex items-center"><CreditCardIcon className="h-4 w-4 mr-2 text-cyan-400"/> {sale.formaPagamento}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-600">
                  <h4 className="font-semibold text-white mb-2 flex items-center"><CubeIcon className="h-4 w-4 mr-2"/> Produtos</h4>
                  <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                    {sale.produtos.map(p => (
                      <li key={p.nomeProduto}>{p.nomeProduto} ({p.unidades} unid.)</li>
                    ))}
                  </ul>
                </div>
              </div>

              <details className="group">
                <summary className="p-3 bg-slate-600/50 cursor-pointer text-sm text-cyan-300 hover:bg-slate-600 flex justify-between items-center rounded-b-lg">
                  Ver Detalhes
                  <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180"/>
                </summary>
                <div className="p-5 bg-slate-700/50 border-t border-slate-600 rounded-b-lg text-sm text-gray-300 space-y-2">
                    <p><strong>CPF:</strong> {sale.cpf}</p>
                    <p><strong>Email:</strong> {sale.email}</p>
                    <p><strong>Telefone:</strong> {formatTelefone(sale.ddd, sale.telefoneNumero)}</p>
                    <p className="flex items-start"><MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-cyan-400 flex-shrink-0"/> 
                        {sale.logradouroRua}, {sale.numeroEndereco} {sale.complemento ? `(${sale.complemento})` : ''} - {sale.bairro}, {sale.cidade} - {sale.estado}, {sale.cep}
                    </p>
                    {sale.observacao && <p><strong>Observação:</strong> {sale.observacao}</p>}
                </div>
              </details>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">
          <p>Nenhum registro encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};

export default SalesList;