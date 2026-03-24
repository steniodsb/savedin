// ============================================
// SaveDin Financial App - TypeScript Types
// ============================================

// Environment types
export interface Environment {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  avatar_url: string | null;
  is_default: boolean;
  created_at: string;
}

// Account types
export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment';

export interface Account {
  id: string;
  user_id: string;
  environment_id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

// Credit Card types
export interface CreditCard {
  id: string;
  user_id: string;
  environment_id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

// Invoice types
export type InvoiceStatus = 'open' | 'closed' | 'paid';

export interface Invoice {
  id: string;
  user_id: string;
  environment_id: string;
  card_id: string;
  month: number;
  year: number;
  status: InvoiceStatus;
  total: number;
  paid_at: string | null;
}

// Category types
export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  user_id: string | null;
  environment_id: string | null;
  name: string;
  slug: string;
  type: CategoryType;
  icon: string;
  color: string;
  bg: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

// Tag types
export interface Tag {
  id: string;
  user_id: string;
  environment_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Transaction types
export type TransactionType = 'expense' | 'income' | 'transfer';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  user_id: string;
  environment_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string;
  category_id: string | null;
  account_id: string | null;
  card_id: string | null;
  invoice_id: string | null;
  tags: string[] | null;
  notes: string | null;
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  installment_total: number | null;
  installment_current: number | null;
  registered_via: string;
  created_at: string;
  // Joined fields (populated from relations)
  category?: Category;
  account?: Account;
  credit_card?: CreditCard;
}

// Budget types
export interface Budget {
  id: string;
  user_id: string;
  environment_id: string;
  category_id: string | null;
  monthly_limit: number;
  month: number;
  year: number;
  is_active: boolean;
  created_at: string;
  // Joined fields
  category?: Category;
  spent?: number; // calculated from transactions
}

// Financial Goal types
export interface FinancialGoal {
  id: string;
  user_id: string;
  environment_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  is_completed: boolean;
  created_at: string;
}

// Investment types
export type InvestmentType = 'crypto' | 'stocks' | 'fixed_income' | 'emergency' | 'daytrade' | 'other';
export type InvestmentEntryType = 'deposit' | 'withdraw' | 'yield';

export interface Investment {
  id: string;
  user_id: string;
  environment_id: string;
  name: string;
  type: InvestmentType;
  invested_amount: number;
  current_value: number;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export interface InvestmentEntry {
  id: string;
  user_id: string;
  environment_id: string;
  investment_id: string;
  type: InvestmentEntryType;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export const investmentTypeLabels: Record<InvestmentType, { label: string; icon: string; color: string }> = {
  crypto: { label: 'Criptomoeda', icon: 'Bitcoin', color: '#F7931A' },
  stocks: { label: 'Ações', icon: 'TrendingUp', color: '#4CAF50' },
  fixed_income: { label: 'Renda Fixa', icon: 'Shield', color: '#2196F3' },
  emergency: { label: 'Reserva de Emergência', icon: 'Umbrella', color: '#FF9800' },
  daytrade: { label: 'Day Trade', icon: 'Activity', color: '#F44336' },
  other: { label: 'Outros', icon: 'Briefcase', color: '#9E9E9E' },
};

// Navigation types for SaveDin
export type SavedinTabType = 'dashboard' | 'accounts' | 'transactions' | 'cards' | 'investments' | 'planning' | 'reports' | 'goals' | 'categories' | 'tags' | 'calendar' | 'performance' | 'settings';

// Dashboard summary types
export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netBalance: number;
  balanceVariation: number; // percentage change from last month
}

export interface MonthlyBalancePoint {
  month: string;
  balance: number;
}

export interface CategoryExpense {
  category: Category;
  amount: number;
  percentage: number;
}

// Utility types
export interface MonthYear {
  month: number;
  year: number;
}

// Format helpers
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Account type labels
export const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  investment: 'Investimentos',
};

// Account type icons
export const accountTypeIcons: Record<AccountType, string> = {
  checking: 'Building2',
  savings: 'PiggyBank',
  wallet: 'Wallet',
  investment: 'TrendingUp',
};
