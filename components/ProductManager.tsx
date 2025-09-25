import React, { useState, useEffect } from 'react';
import { ProductManagerProps, ProdutoInfo } from '../types';
import InputField from './InputField';
import { CubeIcon, PencilIcon, TrashIcon, XMarkIcon } from './icons';

const ProductManager: React.FC<ProductManagerProps> = ({ products, onSave, onDelete, onClose, onNotify }) => {
  const initialFormState: ProdutoInfo = { name: '', preco: 0, status: 'disponível' };
  const [formData, setFormData] = useState<ProdutoInfo>(initialFormState);
  const [editingProductOriginalName, setEditingProductOriginalName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!editingProductOriginalName;

  useEffect(() => {
    const input = document.getElementById('productNameInput');
    if (input) input.focus();
  }, [editingProductOriginalName]);


  const handleCancelEdit = () => {
    setEditingProductOriginalName(null);
    setFormData(initialFormState);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'preco' ? parseFloat(value) || 0 : value }));
  };

  const handleEditClick = (product: ProdutoInfo) => {
    setEditingProductOriginalName(product.name);
    setFormData(product);
    const input = document.getElementById('productNameInput');
    if (input) input.focus();
  };

  const handleDeleteClick = async (productNameToDelete: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${productNameToDelete}"?`)) {
        try {
            await onDelete(productNameToDelete);
            onNotify({ type: 'success', text: 'Produto excluído com sucesso.' });
        } catch (error: any) {
            onNotify({ type: 'error', text: error.message || 'Falha ao excluir o produto.' });
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      onNotify({ type: 'error', text: 'O nome do produto não pode estar vazio.' });
      return;
    }
    
    if (formData.preco < 0) {
        onNotify({ type: 'error', text: 'O preço do produto não pode ser negativo.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave(formData, isEditing ? editingProductOriginalName ?? undefined : undefined);
      onNotify({ type: 'success', text: `Produto ${isEditing ? 'atualizado' : 'adicionado'} com sucesso.` });
      setFormData(initialFormState);
      setEditingProductOriginalName(null);
    } catch (error: any) {
      onNotify({ type: 'error', text: error.message || 'Falha ao salvar o produto.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const StatusBadge: React.FC<{status: 'disponível' | 'indisponível'}> = ({ status }) => {
    const isAvailable = status === 'disponível';
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isAvailable ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
            {status}
        </span>
    );
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="product-manager-title">
      <div className="w-full max-w-3xl bg-slate-800 rounded-xl shadow-2xl p-6 md:p-8 transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 id="product-manager-title" className="text-2xl font-bold text-white">Gerenciar Produtos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-700/50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
             <div className="sm:col-span-3">
                 <InputField
                    label={isEditing ? `Editando: ${editingProductOriginalName}` : 'Adicionar Novo Produto'}
                    id="productNameInput"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nome do produto"
                    required
                    Icon={CubeIcon}
                    className="mb-0"
                />
             </div>
             <div className="sm:col-span-1">
                <InputField
                    label="Preço (R$)"
                    id="productPriceInput"
                    name="preco"
                    type="number"
                    value={formData.preco}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    min={0}
                    step="0.01"
                    className="mb-0"
                />
             </div>
             <div className="sm:col-span-1">
                <label htmlFor="productStatusSelect" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select 
                    id="productStatusSelect"
                    name="status" 
                    value={formData.status} 
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary focus:border-primary"
                >
                    <option value="disponível">Disponível</option>
                    <option value="indisponível">Indisponível</option>
                </select>
             </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-grow bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-md shadow-md"
            >
              {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar Produto' : 'Adicionar Produto')}
            </button>
             {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-md shadow-md"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="max-h-[50vh] overflow-y-auto pr-2">
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Lista de Produtos ({products.length})</h3>
          <ul className="space-y-2">
            {products.map(product => (
              <li key={product.name} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-slate-700 rounded-md transition-colors hover:bg-slate-600/50 gap-3">
                <div className="flex-grow">
                    <p className="text-gray-200 font-semibold break-all">{product.name}</p>
                    <p className="text-primary-light text-sm">{formatCurrency(product.preco)}</p>
                </div>
                <div className="flex items-center space-x-4 flex-shrink-0">
                  <StatusBadge status={product.status} />
                  <button onClick={() => handleEditClick(product)} className="text-primary-light hover:text-primary" title="Editar">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDeleteClick(product.name)} className="text-red-400 hover:text-red-300" title="Excluir">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
            {products.length === 0 && (
                <li className="text-center py-8 text-gray-400">Nenhum produto cadastrado.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductManager;
