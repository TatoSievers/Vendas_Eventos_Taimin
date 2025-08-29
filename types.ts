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