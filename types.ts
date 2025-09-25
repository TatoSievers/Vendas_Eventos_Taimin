// Fix: Manually define types for import.meta.env as a workaround for vite/client type issues.
interface ImportMetaEnv {
  readonly VITE_APP_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import React from 'react';

// Este arquivo define os "formatos" ou "modelos" de dados para toda a aplicação.

/**
 * Detalhes de um único produto dentro de uma venda.
 */
export interface ProductDetail {
  nomeProduto: string;
  unidades: number;
  preco_unitario: number; 
}

/**
 * O modelo completo para um registro de venda, incluindo dados do evento,
 * cliente e os produtos vendidos.
 */
export interface SalesData {
  id: string;
  created_at: string;
  
  // Dados do Vendedor/Evento
  nomeUsuario: string;
  nomeEvento: string;
  dataEvento: string;
  
  // Dados do Cliente
  primeiroNome: string;
  sobrenome: string;
  cpf: string;
  email: string;
  ddd: string;
  telefoneNumero: string;
  
  // Endereço do Cliente
  logradouroRua: string;
  numeroEndereco: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  
  // Detalhes da Venda
  formaPagamento: string;
  valorTotal: number;
  observacao?: string | null;

  // Lista de produtos nesta venda
  produtos: ProductDetail[];
}

/**
 * Detalhes de um evento único, usado para popular filtros e listas.
 */
export interface EventDetail {
  name: string;
  date: string;
}

/**
 * Detalhes de um usuário (vendedor) único.
 */
export interface UserDetail {
  name: string;
}

/**
 * Detalhes de um método de pagamento único.
 */
export interface PaymentMethodDetail {
  name: string;
}

/**
 * Dados coletados na tela de configuração inicial.
 */
export interface InitialSetupData {
  userName: string;
  eventName: string;
  eventDate: string;
}

/**
 * Formato da mensagem para notificações (lightbox).
 */
export interface LightboxMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface InputFieldProps {
  label: string;
  id: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  Icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  readOnly?: boolean;
  className?: string;
  maxLength?: number;
  pattern?: string;
  min?: number;
  step?: string;
}

export interface TextAreaFieldProps {
  label: string;
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  Icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

export interface SalesFormProps {
    onSaveSale: (saleData: SalesData, isEditing: boolean) => Promise<void>;
    editingSale: SalesData | null;
    onCancelEdit: () => void;
    paymentMethods: readonly string[];
    appProducts: ProdutoInfo[];
    currentUser: string;
    currentEventName: string;
    currentEventDate: string;
    onGoBackToSetup: () => void;
    onNotify: (message: LightboxMessage) => void;
}

export interface InitialSetupFormProps {
  onSetupComplete: (setupData: InitialSetupData) => void;
  uniqueEvents: EventDetail[];
  uniqueUsers: UserDetail[];
  onCreateUser: (name: string) => Promise<void>;
  onCreateEvent: (name: string, date: string) => Promise<void>;
  onOpenProductManager: () => void;
}


export interface ProdutoInfo {
  name: string;
  preco: number;
  status: 'disponível' | 'indisponível';
}

export interface ProductManagerProps {
  products: ProdutoInfo[];
  onSave: (product: ProdutoInfo, originalName?: string) => Promise<void>;
  onDelete: (productName: string) => Promise<void>;
  onClose: () => void;
  onNotify: (message: LightboxMessage) => void;
}
