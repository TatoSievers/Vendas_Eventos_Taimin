
import React from 'react';
import { SalesData, ProdutoVenda, SalesListProps as SalesListPropsType } from '../types';
import { DownloadIcon, ChartBarIcon, PencilIcon, TrashIcon } from './icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Import for the autoTable plugin

const SalesList: React.FC<SalesListPropsType> = ({ sales, onNavigateToDashboard, onEditSale, onDeleteSale }) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
  };

  const formatProductsForPdf = (products: ProdutoVenda[] | undefined) => {
    if (!products || products.length === 0) return '-';
    return products.map(p => `${p.nomeProduto} (${p.unidades})`).join(', ');
  };

  const formatTelefone = (ddd: string | undefined, numero: string | undefined) => {
    if (!ddd && !numero) return 'N/A';
    return `(${ddd || ''}) ${numero || ''}`.trim();
  };

  const getExportData = (exportType: 'excel' | 'pdf') => {
    const MAX_PRODUCTS_COLUMNS_EXCEL = 5; // Max product pairs (Name, Units) for Excel

    return sales.map(sale => {
      const baseSaleData: { [key: string]: any } = {
        'Usuário': sale.nomeUsuario,
        'Evento': sale.nomeEvento,
        'Data Evento': formatDate(sale.dataEvento),
        'Primeiro Nome Cliente': sale.primeiroNome,
        'Sobrenome Cliente': sale.sobrenome,
        'CPF': sale.cpf,
        'Email': sale.email,
        'Telefone': formatTelefone(sale.ddd, sale.telefoneNumero),
        'Logradouro (Rua)': sale.logradouroRua,
        'Número End.': sale.numeroEndereco,
        'Complemento End.': sale.complemento || '-',
        'Bairro': sale.bairro,
        'Cidade': sale.cidade,
        'Estado': sale.estado,
        'CEP': sale.cep,
        'Forma de Pagamento': sale.formaPagamento,
        // Product data handled below based on exportType
        'Cód. Cliente': sale.codCliente,
        'Observação': sale.observacao || '-',
      };

      if (exportType === 'excel') {
        const productExcelData: { [key: string]: any } = {};
        for (let i = 0; i < MAX_PRODUCTS_COLUMNS_EXCEL; i++) {
          productExcelData[`Produto ${i + 1}`] = (sale.produtos && sale.produtos[i]) ? sale.produtos[i].nomeProduto : '';
          productExcelData[`Unidades Prod. ${i + 1}`] = (sale.produtos && sale.produtos[i]) ? sale.produtos[i].unidades : '';
        }
        if (sale.produtos && sale.produtos.length > MAX_PRODUCTS_COLUMNS_EXCEL) {
          productExcelData['Produtos Adicionais'] = sale.produtos
            .slice(MAX_PRODUCTS_COLUMNS_EXCEL)
            .map(p => `${p.nomeProduto} (${p.unidades})`)
            .join('; ');
        } else {
          productExcelData['Produtos Adicionais'] = '';
        }
        return { ...baseSaleData, ...productExcelData };
      } else { // PDF
        return {
          ...baseSaleData,
          'Produtos': formatProductsForPdf(sale.produtos),
        };
      }
    });
  };

  const handleDownloadExcel = () => {
    const dataForExcel = getExportData('excel');
    if (dataForExcel.length === 0) {
      alert("Não há dados para exportar em Excel.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

    // Calculate column widths
    const colsWidth = Object.keys(dataForExcel[0] || {}).map(key => {
        const maxLength = Math.max(
            ...dataForExcel.map(row => (row[key] ?? '').toString().length),
            key.length 
        );
        return { wch: maxLength + 2 }; // +2 for a little padding
    });
    worksheet["!cols"] = colsWidth;
    
    XLSX.writeFile(workbook, "Vendas_Taimin_Registros.xlsx");
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dataForPdf = getExportData('pdf');
    
    if (dataForPdf.length === 0) {
      alert("Não há dados para exportar em PDF.");
      return;
    }

    doc.text("Relatório de Vendas - Taimin", 14, 15);
    doc.setFontSize(10);

    const tableColumn = Object.keys(dataForPdf[0]);
    // Ensure all row values are strings for jspdf-autotable, handling potential null/undefined
    const tableRows = dataForPdf.map(row => 
      tableColumn.map(colName => {
        const value = row[colName];
        return value !== null && value !== undefined ? String(value) : '';
      })
    );

    // FIX: Cast doc to 'any' to use the autoTable plugin method, which is not
    // recognized by the default jsPDF type definitions.
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' }, // Reduced font size for more columns
      headStyles: { fillColor: [22, 160, 133], fontSize: 6.5, fontStyle: 'bold' },
      columnStyles: {
         // Example: Adjust specific column widths if needed
        // 'Email': { cellWidth: 30 },
        // 'Produtos': { cellWidth: 50 },
      },
      didParseCell: function (data: any) { // Ensure text fits, especially for header
        if (data.row.section === 'head') {
            if (data.column.dataKey === 'Primeiro Nome Cliente') data.cell.text = 'P. Nome';
            if (data.column.dataKey === 'Sobrenome Cliente') data.cell.text = 'Sobrenome';
            if (data.column.dataKey === 'Logradouro (Rua)') data.cell.text = 'Logradouro';
            if (data.column.dataKey === 'Número End.') data.cell.text = 'Nº';
            if (data.column.dataKey === 'Complemento End.') data.cell.text = 'Compl.';
            if (data.column.dataKey === 'Forma de Pagamento') data.cell.text = 'Pagamento';
            if (data.column.dataKey === 'Data Evento') data.cell.text = 'Dt. Evento';
            if (data.column.dataKey === 'Cód. Cliente') data.cell.text = 'Cód. Cli.';
        }
      }
    });
    doc.save("Vendas_Taimin_Registros.pdf");
  };


  if (sales.length === 0) {
    return (
      <div className="w-full max-w-4xl bg-slate-800 p-8 rounded-xl shadow-2xl text-center">
        <h2 className="text-3xl font-semibold text-white mb-6">Registros de Vendas</h2>
        <p className="text-gray-400">Nenhuma venda registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full xl:max-w-7xl bg-slate-800 p-4 md:p-8 rounded-xl shadow-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-white text-center sm:text-left mb-4 sm:mb-0">Registros de Vendas</h2>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={handleDownloadExcel}
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50 transition duration-150 ease-in-out flex items-center justify-center space-x-2"
              aria-label="Baixar relatório de vendas em formato Excel"
            >
              <DownloadIcon className="h-5 w-5" />
              <span>Baixar Excel</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150 ease-in-out flex items-center justify-center space-x-2"
              aria-label="Baixar relatório de vendas em formato PDF"
            >
              <DownloadIcon className="h-5 w-5" />
              <span>Baixar PDF</span>
            </button>
            <button
              onClick={onNavigateToDashboard}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-150 ease-in-out flex items-center justify-center space-x-2"
              aria-label="Ver relatório gerencial"
            >
              <ChartBarIcon className="h-5 w-5" />
              <span>Relatório Gerencial</span>
            </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700 table-fixed">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Ações</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Usuário</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-40">Evento</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-28">Data Evento</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Nome Cliente</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Sobrenome Cliente</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">CPF</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Telefone</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-40">Logradouro</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-20">Número</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Compl.</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Bairro</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Cidade</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-16">UF</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">CEP</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-40">Forma Pagamento</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-64">Produtos</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Cód. Cliente</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">Observação</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">Email</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-gray-700">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-700/50 transition-colors duration-150">
                <td className="px-2 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => onEditSale(sale.id)} 
                      className="text-primary-light hover:text-primary p-1 rounded hover:bg-slate-600"
                      title="Editar Venda"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteSale(sale.id)} 
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-600"
                      title="Excluir Venda"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.nomeUsuario}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.nomeEvento}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200">{formatDate(sale.dataEvento)}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.primeiroNome}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.sobrenome}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200">{sale.cpf}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200">{formatTelefone(sale.ddd, sale.telefoneNumero)}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.logradouroRua}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200">{sale.numeroEndereco}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.complemento || '-'}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.bairro}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.cidade}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200">{sale.estado}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200">{sale.cep}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.formaPagamento}</td>
                <td className="px-3 py-4 text-sm text-gray-200 whitespace-pre-wrap break-words">{formatProductsForPdf(sale.produtos)}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200">{sale.codCliente}</td>
                <td className="px-3 py-4 text-sm text-gray-200 whitespace-pre-wrap break-words">{sale.observacao || '-'}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 truncate">{sale.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesList;
