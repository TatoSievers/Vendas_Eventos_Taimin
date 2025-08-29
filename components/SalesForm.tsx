
import React, { useState, useEffect } from 'react';
import { SalesData, SalesFormData, ProdutoVenda, SalesFormProps as SalesFormPropsType } from '../types';
import InputField from './InputField';
import { UserIcon, IdCardIcon, EmailIcon, PhoneIcon, MapPinIcon, CreditCardIcon, CubeIcon, PlusCircleIcon, TrashIcon, BuildingOfficeIcon, ArrowUturnLeftIcon } from './icons';
import { PRODUTOS_TAIMIN } from '../constants';

const ADD_NEW_SENTINEL = "ADD_NEW_SENTINEL_VALUE";

const initialFormState: SalesFormData = {
  primeiroNome: '',
  sobrenome: '',
  cpf: '',
  email: '',
  ddd: '',
  telefoneNumero: '',
  logradouroRua: '',
  numeroEndereco: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  formaPagamento: '',
};

const SalesForm: React.FC<SalesFormPropsType> = ({ 
    onSaveSale, 
    editingSale,
    onCancelEdit,
    uniqueEvents, 
    uniquePaymentMethods,
    allSales, 
    currentUser, 
    currentEventName, 
    currentEventDate,
    onGoBackToSetup,
    onNotify
}) => {
  const [formData, setFormData] = useState<SalesFormData>(initialFormState);
  const [selectedProducts, setSelectedProducts] = useState<ProdutoVenda[]>([]);
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [currentUnits, setCurrentUnits] = useState<number | string>(1);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [newPaymentMethodName, setNewPaymentMethodName] = useState<string>('');
  const [showNewPaymentMethodInput, setShowNewPaymentMethodInput] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const isEditing = !!editingSale;

  useEffect(() => {
    if (isEditing && editingSale) {
      const { produtos, id, nomeUsuario, nomeEvento, dataEvento, created_at, ...editableData } = editingSale;
      setFormData(editableData);
      setSelectedProducts(produtos || []);
      
      const isExistingPM = uniquePaymentMethods.some(pm => pm.name === editingSale.formaPagamento);
      if (isExistingPM) {
        setSelectedPaymentMethod(editingSale.formaPagamento);
        setShowNewPaymentMethodInput(false);
        setNewPaymentMethodName('');
      } else if (editingSale.formaPagamento) { 
        setSelectedPaymentMethod(ADD_NEW_SENTINEL); 
        setShowNewPaymentMethodInput(true);
        setNewPaymentMethodName(editingSale.formaPagamento);
      } else {
        setSelectedPaymentMethod('');
        setShowNewPaymentMethodInput(false);
        setNewPaymentMethodName('');
      }
    } else {
      resetFormState(); // Ensure form is truly reset for new entries
    }
  }, [editingSale, isEditing, uniquePaymentMethods]);

  const resetFormState = () => {
    setFormData(initialFormState);
    setSelectedProducts([]);
    setCurrentProduct('');
    setCurrentUnits(1);
    setSelectedPaymentMethod('');
    setNewPaymentMethodName('');
    setShowNewPaymentMethodInput(false);
    setCepLoading(false);
  };

  const handleCancel = () => {
    onCancelEdit(); 
    resetFormState(); 
  };

  const validateDDD = (dddValue: string): boolean => {
    const isValid = /^\d{2}$/.test(dddValue);
    if (!isValid) {
        onNotify({ type: 'error', text: 'DDD inválido. Deve conter exatamente 2 dígitos numéricos.' });
    }
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'ddd') {
      const numericValue = value.replace(/\D/g, ''); // Allow only numbers
      setFormData(prevData => ({
        ...prevData,
        [name]: numericValue,
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleDddBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value) { // Only validate if there is content
        validateDDD(e.target.value);
    }
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === ADD_NEW_SENTINEL) {
      setShowNewPaymentMethodInput(true);
      setSelectedPaymentMethod(ADD_NEW_SENTINEL); 
      setNewPaymentMethodName('');
      setFormData(prev => ({ ...prev, formaPagamento: '' })); 
    } else {
      setShowNewPaymentMethodInput(false);
      setSelectedPaymentMethod(value);
      setNewPaymentMethodName(''); 
      setFormData(prev => ({ ...prev, formaPagamento: value }));
    }
  };
  
  const handleNewPaymentMethodNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNewPaymentMethodName(newName);
    setFormData(prev => ({ ...prev, formaPagamento: newName.trim() }));
  };

  const handleCPFBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isEditing) return; 
    const cpf = e.target.value;
    if (cpf && allSales.length > 0) {
      const existingSale = [...allSales].reverse().find(sale => sale.cpf === cpf);
      if (existingSale) {
        setFormData(prev => ({
          ...prev,
          primeiroNome: existingSale.primeiroNome,
          sobrenome: existingSale.sobrenome,
          email: existingSale.email,
          ddd: existingSale.ddd,
          telefoneNumero: existingSale.telefoneNumero,
          logradouroRua: existingSale.logradouroRua,
          numeroEndereco: existingSale.numeroEndereco,
          complemento: existingSale.complemento,
          bairro: existingSale.bairro,
          cidade: existingSale.cidade,
          estado: existingSale.estado,
          cep: existingSale.cep,
        }));
        onNotify({ type: 'info', text: "Dados do cliente preenchidos com base no CPF." });
        if (existingSale.ddd) validateDDD(existingSale.ddd);
      }
    }
  };

  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Falha ao buscar CEP. Verifique o número digitado.');
        
        const data = await response.json();
        if (data.erro) {
          onNotify({ type: 'info', text: 'CEP não encontrado ou inválido.' });
          setFormData(prev => ({ ...prev, logradouroRua: '', bairro: '', cidade: '', estado: '' }));
        } else {
          setFormData(prev => ({
            ...prev,
            logradouroRua: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
          }));
          onNotify({ type: 'info', text: 'Endereço preenchido automaticamente pelo CEP.' });
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao buscar o CEP.';
        onNotify({ type: 'error', text: errorMessage });
      } finally {
        setCepLoading(false);
      }
    } else if (cep.length > 0) {
      onNotify({ type: 'info', text: 'CEP incompleto. Digite 8 números.' });
    }
  };

  const handleAddProduct = () => {
    const units = typeof currentUnits === 'string' ? parseInt(currentUnits, 10) : currentUnits;
    if (!currentProduct || isNaN(units) || units <= 0) {
      onNotify({ type: 'error', text: 'Selecione um produto e insira uma quantidade válida (maior que 0).' });
      return;
    }

    setSelectedProducts(prev => {
        const existingProductIndex = prev.findIndex(p => p.nomeProduto === currentProduct);
        if (existingProductIndex > -1) {
            const updatedProducts = [...prev];
            updatedProducts[existingProductIndex].unidades += units;
            return updatedProducts;
        }
        return [...prev, { nomeProduto: currentProduct, unidades: units }];
    });
    setCurrentProduct('');
    setCurrentUnits(1);
  };

  const handleRemoveProduct = (productName: string) => {
    setSelectedProducts(prev => prev.filter(p => p.nomeProduto !== productName));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!validateDDD(formData.ddd)) {
      setIsSubmitting(false);
      return;
    }

    if (selectedProducts.length === 0) {
        onNotify({ type: 'error', text: 'Adicione pelo menos um produto à venda.' });
        setIsSubmitting(false);
        return;
    }
    
    const finalPaymentMethod = showNewPaymentMethodInput ? newPaymentMethodName.trim() : selectedPaymentMethod;

    if (!finalPaymentMethod) {
        onNotify({ type: 'error', text: 'Selecione ou cadastre uma forma de pagamento.' });
        setIsSubmitting(false);
        return;
    }

    // Build a clean payload. This object matches the SalesData type but starts without id and created_at
    const salePayload: SalesData = {
      ...formData,
      nomeUsuario: currentUser,
      nomeEvento: currentEventName,
      dataEvento: currentEventDate,
      formaPagamento: finalPaymentMethod,
      produtos: selectedProducts,
    };

    // If editing, add the id and created_at fields back in.
    if (isEditing && editingSale) {
      salePayload.id = editingSale.id;
      salePayload.created_at = editingSale.created_at;
    }

    await onSaveSale(salePayload, isEditing);

    if (!isEditing) {
        resetFormState(); 
    }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-3xl bg-slate-800 p-6 md:p-10 rounded-xl shadow-2xl transition-all duration-300 ease-in-out">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-white">{isEditing ? 'Editar Venda' : 'Registrar Nova Venda'}</h2>
        <button
            onClick={onGoBackToSetup}
            disabled={isEditing || isSubmitting}
            className={`flex items-center text-sm text-primary-light hover:text-primary transition-colors ${(isEditing || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={(isEditing || isSubmitting) ? "Cancele a edição ou aguarde para alterar" : "Voltar para Configuração Inicial"}
        >
            <ArrowUturnLeftIcon className="h-5 w-5 mr-1" />
            Alterar Usuário/Evento
        </button>
      </div>
      
      <div className="mb-6 p-4 bg-slate-700 rounded-md text-sm">
        <p><strong className="font-medium text-gray-300">Usuário:</strong> {currentUser}</p>
        <p><strong className="font-medium text-gray-300">Evento:</strong> {currentEventName}</p>
        <p><strong className="font-medium text-gray-300">Data do Evento:</strong> {currentEventDate ? new Date(currentEventDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</p>
      </div>

      {cepLoading && (
        <div className="p-3 mb-4 rounded-md text-xs bg-sky-500 text-white flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Buscando CEP...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-1">
        <h3 className="text-xl font-semibold text-gray-200 pt-4 pb-2 border-b border-slate-700">Dados do Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <InputField label="Primeiro Nome" id="primeiroNome" name="primeiroNome" type="text" value={formData.primeiroNome} onChange={handleChange} placeholder="Ex: João" required Icon={UserIcon}/>
          <InputField label="Sobrenome" id="sobrenome" name="sobrenome" type="text" value={formData.sobrenome} onChange={handleChange} placeholder="Ex: da Silva" required Icon={UserIcon}/>
        </div>
        <InputField label="CPF" id="cpf" name="cpf" type="text" value={formData.cpf} onChange={handleChange} onBlur={handleCPFBlur} placeholder="Ex: 000.000.000-00" required Icon={IdCardIcon} readOnly={isEditing}/>
        <InputField label="E-mail" id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Ex: joao.silva@example.com" required Icon={EmailIcon}/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
          <InputField 
            label="DDD" 
            id="ddd" 
            name="ddd" 
            type="text"
            value={formData.ddd} 
            onChange={handleChange} 
            onBlur={handleDddBlur}
            placeholder="Ex: 11" 
            required 
            Icon={PhoneIcon} 
            maxLength={2}
            pattern="\d{2}"
          />
          <InputField label="Telefone" id="telefoneNumero" name="telefoneNumero" type="text" value={formData.telefoneNumero} onChange={handleChange} placeholder="Ex: 90000-0000" required Icon={PhoneIcon} className="md:col-span-2"/>
        </div>

        <h3 className="text-xl font-semibold text-gray-200 pt-4 pb-2 border-b border-slate-700">Endereço do Cliente</h3>
        <InputField label="CEP" id="cep" name="cep" type="text" value={formData.cep} onChange={handleChange} onBlur={handleCEPBlur} placeholder="Ex: 00000-000" required Icon={MapPinIcon}/>
        <InputField label="Logradouro (Rua)" id="logradouroRua" name="logradouroRua" type="text" value={formData.logradouroRua} onChange={handleChange} placeholder="Ex: Rua Exemplo" required Icon={MapPinIcon}/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
            <InputField label="Número" id="numeroEndereco" name="numeroEndereco" type="text" value={formData.numeroEndereco} onChange={handleChange} placeholder="Ex: 123" required Icon={MapPinIcon}/>
            <InputField label="Complemento" id="complemento" name="complemento" type="text" value={formData.complemento || ''} onChange={handleChange} placeholder="Ex: Apto 4B" Icon={MapPinIcon} className="md:col-span-2"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
          <InputField label="Bairro" id="bairro" name="bairro" type="text" value={formData.bairro} onChange={handleChange} placeholder="Ex: Centro" required Icon={BuildingOfficeIcon}/>
          <InputField label="Cidade" id="cidade" name="cidade" type="text" value={formData.cidade} onChange={handleChange} placeholder="Ex: São Paulo" required Icon={BuildingOfficeIcon}/>
          <InputField label="Estado" id="estado" name="estado" type="text" value={formData.estado} onChange={handleChange} placeholder="Ex: SP" required Icon={BuildingOfficeIcon}/>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-200 pt-4 pb-2 border-b border-slate-700">Detalhes da Venda</h3>
        <div>
          <label htmlFor="paymentMethodSelector" className="block text-sm font-medium text-gray-300 mb-1">
            Forma de Pagamento <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <CreditCardIcon className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="paymentMethodSelector"
              value={showNewPaymentMethodInput ? ADD_NEW_SENTINEL : selectedPaymentMethod}
              onChange={handlePaymentMethodChange}
              required={!showNewPaymentMethodInput && !formData.formaPagamento && !isEditing} 
              className="w-full p-3 pl-10 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary focus:border-primary"
            >
              <option value="">-- Selecione uma forma de pagamento --</option>
              {uniquePaymentMethods.map(pm => (
                <option key={pm.name} value={pm.name}>{pm.name}</option>
              ))}
              <option value={ADD_NEW_SENTINEL}>Cadastrar Nova...</option>
            </select>
          </div>
          {showNewPaymentMethodInput && (
            <InputField
              label=""
              id="newPaymentMethodName"
              name="newPaymentMethodName"
              type="text"
              value={newPaymentMethodName}
              onChange={handleNewPaymentMethodNameChange}
              placeholder="Digite a nova forma de pagamento"
              required={showNewPaymentMethodInput}
              Icon={CreditCardIcon}
              className="mt-3"
            />
          )}
        </div>

        <h4 className="text-lg font-medium text-gray-200 pt-4">Produtos</h4>
        <div className="space-y-4 p-4 bg-slate-700/50 rounded-md">
            <div className="flex justify-center items-end space-x-4">
                <div className="w-full max-w-sm">
                    <label htmlFor="produto" className="block text-sm font-medium text-gray-300 mb-1">Produto</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                            <CubeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <select
                            id="produto"
                            value={currentProduct}
                            onChange={(e) => setCurrentProduct(e.target.value)}
                            className="w-full p-3 pl-10 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary focus:border-primary"
                        >
                            <option value="">-- Selecione um produto --</option>
                            {PRODUTOS_TAIMIN.map(prod => (
                                <option key={prod.name} value={prod.name}>{prod.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="w-24">
                     <InputField label="Unid." id="unidades" name="unidades" type="number" value={currentUnits} 
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                                setCurrentUnits('');
                            } else {
                                const num = parseInt(val, 10);
                                setCurrentUnits(isNaN(num) ? '' : Math.max(1, num));
                            }
                        }}
                        min={1}
                     />
                </div>
                <button
                    type="button"
                    onClick={handleAddProduct}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-3 rounded-md shadow-md flex items-center justify-center"
                    title="Adicionar Produto"
                >
                    <PlusCircleIcon className="h-5 w-5" />
                </button>
            </div>
            {selectedProducts.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">Produtos adicionados:</h4>
                    <ul className="list-disc list-inside pl-1 text-sm text-gray-200 max-h-32 overflow-y-auto bg-slate-600/50 p-3 rounded-md">
                        {selectedProducts.map(p => (
                            <li key={p.nomeProduto} className="flex justify-between items-center py-1">
                                <span>{p.nomeProduto} ({p.unidades} unid.)</span>
                                <button type="button" onClick={() => handleRemoveProduct(p.nomeProduto)} className="text-red-400 hover:text-red-300" title="Remover Produto">
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
            type="submit"
            disabled={isSubmitting || cepLoading}
            className="w-full sm:w-auto flex-grow bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            aria-live="polite"
            >
            {isSubmitting ? (
                <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
                </div>
            ) : (isEditing ? 'Atualizar Venda' : 'Registrar Venda')}
            </button>
            {isEditing && (
                <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50"
                >
                    Cancelar Edição
                </button>
            )}
        </div>
      </form>
    </div>
  );
};

export default SalesForm;
