
export interface ProdutoVenda {
  nomeProduto: string;
  unidades: number;
}

export interface SalesData {
  id: string; // Unique ID for each sale
  created_at: string; // Supabase timestamp
  nomeUsuario: string; // User who registered the sale
  nomeEvento: string;
  dataEvento: string; // Stored as YYYY-MM-DD
  
  primeiroNome: string; // Customer's first name
  sobrenome: string; // Customer's last name
  cpf: string;
  email: string;
  ddd: string;
  telefoneNumero: string;
  
  logradouroRua: string; 
  numeroEndereco: string; // To avoid conflict with product 'unidades' or other 'numero'
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;

  formaPagamento: string;
  
  produtos: ProdutoVenda[];
  
  observacao: string | null;
  codCliente: string | null;
}

// For fields that are part of SalesData but might be handled differently in forms
export type SalesFormData = Omit<SalesData, 'id' | 'nomeUsuario' | 'produtos' | 'nomeEvento' | 'dataEvento' | 'created_at'>;


export interface InputFieldProps {
  label: string;
  id: string;
  name: keyof SalesFormData | 'unidades' | 'newUserName' | 'newEventName' | 'newPaymentMethodName' | 'dataEvento'; // Extended for new specific inputs and dataEvento
  type: string;
  value: string | number; // Value can be number for 'unidades'
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; // Added for CPF check
  placeholder?: string;
  required?: boolean;
  Icon?: React.ElementType;
  readOnly?: boolean;
  className?: string;
  maxLength?: number; // For fields like DDD
  pattern?: string; // For input validation if needed
  min?: string | number; // For number inputs like unidades
}

export interface TextAreaFieldProps {
  label:string;
  id: string;
  name: keyof SalesFormData;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  Icon?: React.ElementType;
}

export interface EventDetail {
  name: string;
  date: string; // Stored as YYYY-MM-DD
}

export interface UserDetail {
  name: string;
}

export interface PaymentMethodDetail {
  name: string;
}

export interface ProdutoInfo {
  name: string;
}

export interface InitialSetupData {
  userName: string;
  eventName: string;
  eventDate: string;
}

export interface LightboxMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface SalesFormProps {
  onSaveSale: (sale: SalesData, isEditing: boolean) => void;
  editingSale: SalesData | null;
  onCancelEdit: () => void;
  uniqueEvents: EventDetail[]; 
  uniquePaymentMethods: PaymentMethodDetail[];
  allSales: SalesData[]; 
  currentUser: string;
  currentEventName: string;
  currentEventDate: string;
  onGoBackToSetup: () => void;
  onNotify: (message: LightboxMessage) => void;
}

export interface SalesListProps {
  sales: SalesData[];
  onNavigateToDashboard: () => void;
  onEditSale: (saleId: string) => void;
  onDeleteSale: (saleId: string) => void;
  onNotify: (message: LightboxMessage) => void;
}
