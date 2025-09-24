

// FIX: Import React to make its types available in this file.
import React from 'react';

// Este arquivo define os "formatos" ou "modelos" de dados para toda a aplicação.

/**
 * Detalhes de um único produto dentro de uma venda.
 */
export interface ProductDetail {
  nomeProduto: string;
  unidades: number;
  preco_unitario?: number; // Opcional por enquanto
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
  observacao?: string | null; // <-- Campo adicionado/confirmado

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

// FIX: Added missing interface for InputField component props.
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
}

// FIX: Added missing interface for TextAreaField component props.
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

// FIX: Added missing interface for SalesForm component props.
export interface SalesFormProps {
    onSaveSale: (saleData: SalesData, isEditing: boolean) => Promise<void>;
    editingSale: SalesData | null;
    onCancelEdit: () => void;
    uniquePaymentMethods: PaymentMethodDetail[];
    allSales: SalesData[];
    currentUser: string;
    currentEventName: string;
    currentEventDate: string;
    onGoBackToSetup: () => void;
    onNotify: (message: LightboxMessage) => void;
    onCreatePaymentMethod: (name: string) => Promise<void>;
}

export interface InitialSetupFormProps {
  onSetupComplete: (setupData: InitialSetupData) => void;
  uniqueEvents: EventDetail[];
  uniqueUsers: UserDetail[];
  onCreateUser: (name: string) => Promise<void>;
  onCreateEvent: (name: string, date: string) => Promise<void>;
}


// FIX: Added missing interface for product information used in constants.
export interface ProdutoInfo {
  name: string;
}