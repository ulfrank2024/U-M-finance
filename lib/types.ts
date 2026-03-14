export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_color: string
  avatar_url: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  is_fixed: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type TransactionType = 'income' | 'expense'
export type TransactionScope = 'personal' | 'common' | 'shared'

export interface Transaction {
  id: string
  user_id: string
  amount: number
  description: string | null
  category_id: string | null
  type: TransactionType
  scope: TransactionScope
  shared_group_id: string | null
  credit_card_id: string | null
  bank_account_id: string | null
  exchange_rate: number | null
  foreign_amount: number | null
  foreign_currency: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
  // Relations
  categories?: Category | null
  profiles?: Profile | null
  updated_by_profile?: Profile | null
  shared_groups?: SharedGroup | null
  credit_cards?: CreditCard | null
  bank_accounts?: BankAccount | null
}

export interface SharedGroup {
  id: string
  name: string
  description: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  created_by_profile?: Profile | null
  transactions?: Transaction[]
}

export interface BankAccount {
  id: string
  owner_id: string | null
  name: string
  color: string
  is_shared: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
  // Calculé par l'API
  balance: number
  total_income: number
  total_expenses: number
  owner?: Profile | null
}

export interface CreditCardPayment {
  id: string
  credit_card_id: string
  user_id: string
  amount: number
  note: string | null
  payment_date: string
  created_at: string
  profiles?: Profile | null
}

export interface CreditCard {
  id: string
  owner_id: string | null
  name: string
  last_four: string | null
  credit_limit: number | null
  opening_balance: number | null
  due_date: number | null
  is_shared: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
  // Calculé par l'API
  total_spent: number
  total_paid: number
  current_balance: number
  owner?: Profile | null
  credit_card_payments?: CreditCardPayment[]
}

export type ProjectStatus = 'active' | 'completed' | 'paused'

export interface ProjectContribution {
  id: string
  project_id: string
  user_id: string
  amount: number
  note: string | null
  created_at: string
  profiles?: Profile | null
}

export interface Project {
  id: string
  name: string
  description: string | null
  target_amount: number
  deadline: string | null
  status: ProjectStatus
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  // Calculé par l'API
  current_amount: number
  created_by_profile?: Profile | null
  project_contributions?: ProjectContribution[]
}

export interface BalanceSummary {
  user_id: string
  display_name: string
  avatar_color: string
  avatar_url: string | null
  income: number
  personal_expenses: number
  common_expenses: number
  shared_expenses: number
  total_expenses: number
  card_debt: number
  net: number
}

export interface BalanceResponse {
  summary: BalanceSummary[]
  balance: {
    debtor: string
    creditor: string
    amount: number
  } | null
  couple_total: {
    income: number
    total_expenses: number
    net: number
  }
}

export interface ReportCardDetail {
  id: string
  name: string
  last_four: string | null
  credit_limit: number | null
  is_shared: boolean
  owner: { id: string; display_name: string; avatar_color: string } | null
  total_spent: number
  total_paid: number
  current_balance: number
  paid_this_month: number
}

export interface ReportData {
  month: string
  income: number
  fixed_expenses: number
  variable_expenses: number
  savings: number
  savings_rate: number
  card_debt: number
  cards_detail: ReportCardDetail[]
  fixed_breakdown: { category_id: string | null; name: string; icon: string; color: string; amount: number }[]
  variable_breakdown: { category_id: string | null; name: string; icon: string; color: string; amount: number }[]
  trend: { month: string; income: number; expenses: number }[]
}
