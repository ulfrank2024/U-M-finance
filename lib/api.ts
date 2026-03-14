import type {
  BankAccount, BalanceResponse, Category, CreditCard, CreditCardPayment,
  Profile, Project, ProjectContribution, SharedGroup, Transaction
} from './types'

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Erreur ${res.status}`)
  }
  return res.json()
}

// Balance
export const fetchBalance = (month: string) =>
  req<BalanceResponse>(`/api/balance?month=${month}`)

// Transactions
export const fetchTransactions = (params: Record<string, string> = {}) => {
  const q = new URLSearchParams(params).toString()
  return req<Transaction[]>(`/api/transactions${q ? `?${q}` : ''}`)
}
export const createTransaction = (body: Partial<Transaction>) =>
  req<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(body) })
export const updateTransaction = (id: string, body: Partial<Transaction>) =>
  req<Transaction>(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteTransaction = (id: string) =>
  req<{ success: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' })

// Categories
export const fetchCategories = () => req<Category[]>('/api/categories')
export const createCategory = (body: Partial<Category>) =>
  req<Category>('/api/categories', { method: 'POST', body: JSON.stringify(body) })
export const updateCategory = (id: string, body: Partial<Category>) =>
  req<Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteCategory = (id: string) =>
  req<{ success: boolean }>(`/api/categories/${id}`, { method: 'DELETE' })

// Shared Groups
export const fetchSharedGroups = () => req<SharedGroup[]>('/api/shared-groups')
export const createSharedGroup = (body: { name: string; description?: string }) =>
  req<SharedGroup>('/api/shared-groups', { method: 'POST', body: JSON.stringify(body) })
export const updateSharedGroup = (id: string, body: { name?: string; description?: string }) =>
  req<SharedGroup>(`/api/shared-groups/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteSharedGroup = (id: string) =>
  req<{ success: boolean }>(`/api/shared-groups/${id}`, { method: 'DELETE' })

// Credit Cards
export const fetchCreditCards = () => req<CreditCard[]>('/api/credit-cards')
export const createCreditCard = (body: Partial<CreditCard>) =>
  req<CreditCard>('/api/credit-cards', { method: 'POST', body: JSON.stringify(body) })
export const updateCreditCard = (id: string, body: Partial<CreditCard>) =>
  req<CreditCard>(`/api/credit-cards/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteCreditCard = (id: string) =>
  req<{ success: boolean }>(`/api/credit-cards/${id}`, { method: 'DELETE' })
export const addCardPayment = (cardId: string, body: { amount: number; note?: string; payment_date?: string; bank_account_id?: string }) =>
  req<CreditCardPayment>(`/api/credit-cards/${cardId}/payments`, { method: 'POST', body: JSON.stringify(body) })
export const deleteCardPayment = (cardId: string, paymentId: string) =>
  req<{ success: boolean }>(`/api/credit-cards/${cardId}/payments/${paymentId}`, { method: 'DELETE' })

// Projects
export const fetchProjects = () => req<Project[]>('/api/projects')
export const createProject = (body: Partial<Project>) =>
  req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) })
export const updateProject = (id: string, body: Partial<Project>) =>
  req<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteProject = (id: string) =>
  req<{ success: boolean }>(`/api/projects/${id}`, { method: 'DELETE' })
export const addContribution = (projectId: string, body: { amount: number; note?: string }) =>
  req<ProjectContribution>(`/api/projects/${projectId}/contributions`, { method: 'POST', body: JSON.stringify(body) })

// Bank Accounts
export const fetchBankAccounts = () => req<BankAccount[]>('/api/bank-accounts')
export const createBankAccount = (body: { name: string; color?: string; is_shared?: boolean; owner_id?: string }) =>
  req<BankAccount>('/api/bank-accounts', { method: 'POST', body: JSON.stringify(body) })
export const updateBankAccount = (id: string, body: Partial<BankAccount>) =>
  req<BankAccount>(`/api/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteBankAccount = (id: string) =>
  req<{ success: boolean }>(`/api/bank-accounts/${id}`, { method: 'DELETE' })

// Profile
export const fetchProfile = () => req<Profile>('/api/profile')
export const updateProfile = (body: { display_name?: string; avatar_color?: string }) =>
  req<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(body) })
