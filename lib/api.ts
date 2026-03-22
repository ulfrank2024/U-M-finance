import type {
  BankAccount, BalanceResponse, Budget, Category, CreditCard, CreditCardPayment,
  Profile, Project, ProjectContribution, ReportData, SharedGroup, Transaction,
  ShoppingList, ShoppingItem, Transfer
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
export const fetchCreditCards = (mine = false) => req<CreditCard[]>(`/api/credit-cards${mine ? '?mine=true' : ''}`)
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
export const fetchBankAccounts = (mine = false) => req<BankAccount[]>(`/api/bank-accounts${mine ? '?mine=true' : ''}`)
export const createBankAccount = (body: { name: string; color?: string; is_shared?: boolean; owner_id?: string }) =>
  req<BankAccount>('/api/bank-accounts', { method: 'POST', body: JSON.stringify(body) })
export const updateBankAccount = (id: string, body: Partial<BankAccount>) =>
  req<BankAccount>(`/api/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteBankAccount = (id: string) =>
  req<{ success: boolean }>(`/api/bank-accounts/${id}`, { method: 'DELETE' })

// Profile
export const fetchProfile = () => req<Profile>('/api/profile')
export const updateProfile = (body: { display_name?: string; avatar_color?: string; birthday?: string }) =>
  req<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(body) })

// Report
export const fetchReport = (month: string) => req<ReportData>(`/api/report?month=${month}`)

// Budgets
export const fetchBudgets = () => req<Budget[]>('/api/budgets')
export const createBudget = (body: { category_id: string; monthly_amount: number }) =>
  req<Budget>('/api/budgets', { method: 'POST', body: JSON.stringify(body) })
export const updateBudget = (id: string, body: { monthly_amount: number }) =>
  req<Budget>(`/api/budgets/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteBudget = (id: string) =>
  req<{ success: boolean }>(`/api/budgets/${id}`, { method: 'DELETE' })

// Shopping Lists
export const fetchShoppingLists = () => req<ShoppingList[]>('/api/shopping-lists')
export const createShoppingList = (data: { name: string; store_name?: string; category_id?: string | null; planned_date?: string | null; parent_id?: string | null }) =>
  req<ShoppingList>('/api/shopping-lists', { method: 'POST', body: JSON.stringify(data) })
export const fetchShoppingList = (id: string) => req<ShoppingList>(`/api/shopping-lists/${id}`)
export const updateShoppingList = (id: string, data: Partial<Pick<ShoppingList, 'name' | 'store_name' | 'category_id' | 'planned_date' | 'status' | 'parent_id'>>) =>
  req<ShoppingList>(`/api/shopping-lists/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteShoppingList = (id: string) =>
  req<void>(`/api/shopping-lists/${id}`, { method: 'DELETE' })
export const addShoppingItem = (listId: string, data: { name: string; quantity?: string; estimated_price?: number | null }) =>
  req<ShoppingItem>(`/api/shopping-lists/${listId}/items`, { method: 'POST', body: JSON.stringify(data) })
export const updateShoppingItem = (listId: string, itemId: string, data: { name?: string; quantity?: string | null; estimated_price?: number | null; actual_price?: number | null; is_checked?: boolean }) =>
  req<ShoppingItem>(`/api/shopping-lists/${listId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteShoppingItem = (listId: string, itemId: string) =>
  req<void>(`/api/shopping-lists/${listId}/items/${itemId}`, { method: 'DELETE' })
export const duplicateShoppingList = (id: string, data: { parent_id: string }) =>
  req<ShoppingList>(`/api/shopping-lists/${id}/duplicate`, { method: 'POST', body: JSON.stringify(data) })

// Transfers
export const fetchTransfers = (month?: string) =>
  req<Transfer[]>(`/api/transfers${month ? `?month=${month}` : ''}`)
export const createTransfer = (data: { to_user: string; amount: number; note?: string; transfer_date?: string; from_account_id?: string; to_account_id?: string }) =>
  req<Transfer>('/api/transfers', { method: 'POST', body: JSON.stringify(data) })
export const deleteTransfer = (id: string) =>
  req<{ success: boolean }>(`/api/transfers/${id}`, { method: 'DELETE' })
