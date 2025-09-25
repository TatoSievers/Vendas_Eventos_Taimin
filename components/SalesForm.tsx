import React, { useState, useEffect } from 'react';
import { SalesData, ProductDetail, SalesFormProps as SalesFormPropsType } from '../types';
import InputField from './InputField';
import { UserIcon, IdCardIcon, EmailIcon, PhoneIcon, MapPinIcon, CreditCardIcon, CubeIcon, TrashIcon, BuildingOfficeIcon, ArrowUturnLeftIcon } from './icons';


const SalesForm: React.FC<SalesFormPropsType> = ({ 
    onSaveSale, 
    editingSale,
    onCancelEdit,
    paymentMethods,
    appProducts,
    currentUser, 
    currentEventName, 
    currentEventDate,
    onGoBackToSetup,
    onNotify
}) => {
  const getInitialFormState = (): SalesData => ({
    primeiroNome: '',
    sobrenome: '',
    cpf: '',
    email: '',
    ddd: '',
    telefoneNumero: '',
    logradouroRua: '',
    numeroEndereco: '',
    complemento: null,
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    formaPagamento: '',
    valorTotal: 0,
    id: crypto.randomUUID(), // Pre-generate ID on client
    created_at: new Date().toISOString(),
    nomeUsuario: currentUser,
    nomeEvento: currentEventName,
    dataEvento: currentEventDate,
    produtos: [],
    observacao: null
  });

  const [formData, setFormData] = useState<SalesData>(getInitialFormState());
  const [selectedProducts, setSelectedProducts] = useState<ProductDetail[]>([]);
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [currentUnits, setCurrentUnits] = useState<number | string>(1);
  const [totalVenda, setTotalVenda] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const isEditing = !!editingSale;

  useEffect(() => {
    if (isEditing && editingSale) {
      setFormData(editingSale);
      setSelectedProducts(editingSale.produtos || []);
    } else {
      resetFormState();
    }
  }, [editingSale, isEditing, currentUser, currentEventName, currentEventDate]);
  
  useEffect(() => {
    const total = selectedProducts.reduce((sum, p) => sum + (p.preco_unitario * p.unidades), 0);
    setTotalVenda(total);
  }, [selectedProducts]);

  const resetFormState = () => {
    setFormData(getInitialFormState());
    setSelectedProducts([]);
    setCurrentProduct('');
    setCurrentUnits(1);
    setCepLoading(false);
  };
  
  const handleCancel = () => {
    onCancelEdit(); 
    resetFormState(); 
  };

  const validateDDD = (dddValue: string): boolean => {
    const isValid = /^\d{2}$/.test(dddValue);
    if (!isValid && dddValue) {
        onNotify({ type: 'error', text: 'DDD inválido. Deve conter exatamente 2 dígitos numéricos.' });
    }
    return isValid || !dddValue;
  };

  const formatCPF = (value: string): string => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 11);
    let formatted = onlyDigits;
    if (onlyDigits.length > 3) {
      formatted = `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3)}`;
    }
    if (onlyDigits.length > 6) {
      formatted = `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3, 6)}.${onlyDigits.slice(6)}`;
    }
    if (onlyDigits.length > 9) {
      formatted = `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3, 6)}.${onlyDigits.slice(6, 9)}-${onlyDigits.slice(9)}`;
    }
    return formatted;
  };

  const validateCPF = (cpf: string): boolean => {
    const requiredCpfPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (cpf && !requiredCpfPattern.test(cpf)) {
        onNotify({ type: 'error', text: 'Formato de CPF inválido. O formato correto é XXX.XXX.XXX-XX.' });
        return false;
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      setFormData(prevData => ({ ...prevData, [name]: formatCPF(value) }));
    } else if (name === 'ddd') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prevData => ({ ...prevData, [name]: numericValue }));
    } else {
      setFormData(prevData => ({ ...prevData, [name]: value }));
    }
  };

  const handleDddBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value) {
        validateDDD(e.target.value);
    }
  };

  const handleCPFBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cpf = e.target.value;

    if (!validateCPF(cpf)) return;
    if (isEditing) return; 
    
    if (cpf) {
        try {
            const response = await fetch(`/api/customers/${encodeURIComponent(cpf)}`);
            if (response.ok) {
                const customerData = await response.json();
                setFormData(prev => ({ ...prev, ...customerData }));
                onNotify({ type: 'info', text: "Dados do cliente preenchidos com base no CPF." });
            } else if (response.status !== 404) {
                 onNotify({ type: 'error', text: "Erro ao buscar dados do cliente." });
            }
        } catch (error) {
            onNotify({ type: 'error', text: "Falha na comunicação com o servidor ao buscar CPF." });
        }
    }
  };

  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Falha ao buscar CEP.');
        
        const data = await response.json();
        if (data.erro) {
          onNotify({ type: 'info', text: 'CEP não encontrado.' });
        } else {
          setFormData(prev => ({
            ...prev,
            logradouroRua: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
          }));
          onNotify({ type: 'info', text: 'Endereço preenchido.' });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao buscar o CEP.';
        onNotify({ type: 'error', text: errorMessage });
      } finally {
        setCepLoading(false);
      }
    } else if (cep.length > 0) {
      onNotify({ type: 'info', text: 'CEP incompleto.' });
    }
  };

  const handleAddProduct = () => {
    const units = typeof currentUnits === 'string' ? parseInt(currentUnits, 10) : currentUnits;
    if (!currentProduct || isNaN(units) || units <= 0) {
      onNotify({ type: 'error', text: 'Selecione um produto e uma quantidade válida.' });
      return;
    }
    
    const productInfo = appProducts.find(p => p.name === currentProduct);
    if (!productInfo) {
      onNotify({ type: 'error', text: 'Produto selecionado não encontrado.' });
      return;
    }

    setSelectedProducts(prev => {
        const existingProductIndex = prev.findIndex(p => p.nomeProduto === currentProduct);
        if (existingProductIndex > -1) {
            const updatedProducts = [...prev];
            updatedProducts[existingProductIndex].unidades += units;
            return updatedProducts;
        }
        return [...prev, { nomeProduto: currentProduct, unidades: units, preco_unitario: productInfo.preco }];
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

    if (!validateCPF(formData.cpf)) {
        setIsSubmitting(false);
        return;
    }

    if (selectedProducts.length === 0) {
        onNotify({ type: 'error', text: 'Adicione pelo menos um produto.' });
        setIsSubmitting(false);
        return;
    }
    
    if (!formData.formaPagamento) {
        onNotify({ type: 'error', text: 'Selecione uma forma de pagamento.' });
        setIsSubmitting(false);
        return;
    }

    try {
      const salePayload: SalesData = {
        ...formData,
        nomeUsuario: currentUser,
        nomeEvento: currentEventName,
        dataEvento: currentEventDate,
        produtos: selectedProducts,
        valorTotal: totalVenda,
      };
  
      await onSaveSale(salePayload, isEditing);
  
      if (!isEditing) {
          resetFormState(); 
      }
    } catch (error: any) {
      onNotify({type: 'error', text: error.message || 'Falha ao salvar a venda.' });
    } finally {
      setIsSubmitting(false);
    }
  };
    
  const availableProducts = appProducts.filter(p => p.status === 'disponível');

  return (
    <div className="w-full max-w-3xl bg-slate-800 p-6 md:p-10 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-white">{isEditing ? 'Editar Venda' : 'Registrar Nova Venda'}</h2>
        <button
            onClick={onGoBackToSetup}
            disabled={isEditing || isSubmitting}
            className={`flex items-center text-sm text-primary-light hover:text-primary transition-colors ${(isEditing || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={(isEditing || isSubmitting) ? "Cancele a edição para alterar" : "Voltar para Configuração"}
        >
            <ArrowUturnLeftIcon className="h-5 w-5 mr-1" />
            Alterar Usuário/Evento
        </button>
      </div>
      
      {cepLoading && (
        <div className="p-3 mb-4 rounded-md text-xs bg-sky-500 text-white flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z..."></path>
            </svg>
            Buscando CEP...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-1">
        <h3 className="text-xl font-semibold text-gray-200 pt-4 pb-2 border-b border-slate-700">Dados do Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <InputField label="Primeiro Nome" id="primeiroNome" name="primeiroNome" value={formData.primeiroNome} onChange={handleChange} required Icon={UserIcon}/>
          <InputField label="Sobrenome" id="sobrenome" name="sobrenome" value={formData.sobrenome} onChange={handleChange} required Icon={UserIcon}/>
        </div>
        <InputField label="CPF" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} onBlur={handleCPFBlur} required Icon={IdCardIcon} readOnly={isEditing} maxLength={14} />
        <InputField label="E-mail" id="email" name="email" type="email" value={formData.email} onChange={handleChange} required Icon={EmailIcon}/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
          <InputField label="DDD" id="ddd" name="ddd" value={formData.ddd} onChange={handleChange} onBlur={handleDddBlur} required Icon={PhoneIcon} maxLength={2} pattern="\d{2}"/>
          <InputField label="Telefone" id="telefoneNumero" name="telefoneNumero" value={formData.telefoneNumero} onChange={handleChange} required Icon={PhoneIcon} className="md:col-span-2"/>
        </div>

        <h3 className="text-xl font-semibold text-gray-200 pt-4 pb-2 border-b border-slate-700">Endereço do Cliente</h3>
        <InputField label="CEP" id="cep" name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCEPBlur} required Icon={MapPinIcon}/>
        <InputField label="Logradouro (Rua)" id="logradouroRua" name="logradouroRua" value={formData.logradouroRua} onChange={handleChange} required Icon={MapPinIcon}/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
            <InputField label="Número" id="numeroEndereco" name="numeroEndereco" value={formData.numeroEndereco} onChange={handleChange} required Icon={MapPinIcon}/>
            <InputField label="Complemento" id="complemento" name="complemento" value={formData.complemento || ''} onChange={handleChange} Icon={MapPinIcon} className="md:col-span-2"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
          <InputField label="Bairro" id="bairro" name="bairro" value={formData.bairro} onChange={handleChange} required Icon={BuildingOfficeIcon}/>
          <InputField label="Cidade" id="cidade" name="cidade" value={formData.cidade} onChange={handleChange} required Icon={BuildingOfficeIcon}/>
          <InputField label="Estado" id="estado" name="estado" value={formData.estado} onChange={handleChange} required Icon={BuildingOfficeIcon}/>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-200 pt-4 pb-2 border-b border-slate-700">Detalhes da Venda</h3>
        <div className="mb-6">
          <label htmlFor="formaPagamento" className="block text-sm font-medium text-gray-300 mb-1">Forma de Pagamento <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"><CreditCardIcon className="h-5 w-5 text-gray-400" /></div>
            <select
              id="formaPagamento"
              name="formaPagamento"
              value={formData.formaPagamento}
              onChange={handleChange}
              required
              className="w-full p-3 pl-10 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary focus:border-primary"
            >
              <option value="">-- Selecione uma forma de pagamento --</option>
              {paymentMethods.map(pm => (<option key={pm} value={pm}>{pm}</option>))}
            </select>
          </div>
        </div>

        <h4 className="text-lg font-medium text-gray-200 pt-4">Produtos</h4>
        <div className="space-y-4 p-4 bg-slate-700/50 rounded-md">
            
            <div className="flex items-start gap-4">
                <div className="flex-grow">
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
                            {availableProducts.map(prod => (
                                <option key={prod.name} value={prod.name}>{prod.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="shrink-0 w-24">
                    <label htmlFor="unidades" className="block text-sm font-medium text-gray-300 mb-1">Unid.</label>
                    <input
                        id="unidades"
                        name="unidades"
                        type="number"
                        value={currentUnits} 
                        onChange={(e) => {
                            const val = e.target.value;
                            setCurrentUnits(val === '' ? '' : Math.max(1, parseInt(val, 10) || 1));
                        }}
                        min={1}
                        className="w-full p-3 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 focus:ring-primary focus:border-primary transition duration-150 ease-in-out"
                     />
                </div>
            </div>

            <div className="pt-2">
                <button
                    type="button"
                    onClick={handleAddProduct}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold p-3 rounded-md shadow-md flex items-center justify-center"
                    title="Adicionar Produto"
                >
                    Adicionar
                </button>
            </div>
            
            {selectedProducts.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">Produtos adicionados:</h4>
                    <div className="max-h-32 overflow-y-auto bg-slate-600/50 p-3 rounded-md">
                        <table className="w-full text-sm text-left">
                            <tbody>
                            {selectedProducts.map(p => (
                                <tr key={p.nomeProduto} className="border-b border-slate-500/50 last:border-b-0">
                                    <td className="py-1 text-gray-200">{p.nomeProduto}</td>
                                    <td className="py-1 text-center text-gray-300">x {p.unidades}</td>
                                    <td className="py-1 text-right text-gray-200">{(p.preco_unitario * p.unidades).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="py-1 text-right">
                                        <button type="button" onClick={() => handleRemoveProduct(p.nomeProduto)} className="text-red-400 hover:text-red-300" title="Remover Produto">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="text-right text-xl font-bold text-white mt-4 pr-2">
                        Total: {totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                </div>
            )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
            type="submit"
            disabled={isSubmitting || cepLoading}
            className="w-full sm:w-auto flex-grow bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-md shadow-md"
            >
            {isSubmitting ? 'Processando...' : (isEditing ? 'Atualizar Venda' : 'Registrar Venda')}
            </button>
            {isEditing && (
                <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-md shadow-md"
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
