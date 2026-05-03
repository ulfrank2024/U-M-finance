import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bank-accounts?mine=true&month=2026-04
// month filtre revenus/dépenses ; le solde reste toujours cumulatif (solde réel du compte)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const mine  = params.get('mine') === 'true'
  const month = params.get('month') // ex: '2026-04'

  let dateStart: string | null = null
  let dateEnd:   string | null = null
  if (month) {
    const [year, m] = month.split('-').map(Number)
    dateStart = `${month}-01T00:00:00.000Z`
    dateEnd   = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999)).toISOString()
  }

  let q = supabase
    .from('bank_accounts')
    .select(`*, owner:profiles!bank_accounts_owner_id_fkey(id, display_name, avatar_color, avatar_url)`)
    .order('created_at', { ascending: true })

  if (mine) {
    q = q.or(`owner_id.eq.${user.id},owner_id.is.null,is_shared.eq.true`)
  }

  const { data: accounts, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accountsWithBalance = await Promise.all(
    (accounts || []).map(async (account) => {
      // Revenus du mois (ou tout si pas de filtre)
      let incomeQ = supabase.from('transactions').select('amount').eq('bank_account_id', account.id).eq('type', 'income')
      if (dateStart) incomeQ = incomeQ.gte('created_at', dateStart)
      if (dateEnd)   incomeQ = incomeQ.lte('created_at', dateEnd)
      const { data: incomeTxs } = await incomeQ

      // Dépenses du mois
      let expenseQ = supabase.from('transactions').select('amount').eq('bank_account_id', account.id).eq('type', 'expense')
      if (dateStart) expenseQ = expenseQ.gte('created_at', dateStart)
      if (dateEnd)   expenseQ = expenseQ.lte('created_at', dateEnd)
      const { data: expenseTxs } = await expenseQ

      // Paiements CC du mois (sorties réelles du compte)
      let ccQ = supabase.from('credit_card_payments').select('amount').eq('bank_account_id', account.id)
      if (dateStart) ccQ = ccQ.gte('payment_date', dateStart)
      if (dateEnd)   ccQ = ccQ.lte('payment_date', dateEnd)
      const { data: monthCardPayments } = await ccQ

      // Solde cumulatif (toutes périodes confondues — solde réel du compte)
      const { data: allIncome }    = await supabase.from('transactions').select('amount').eq('bank_account_id', account.id).eq('type', 'income')
      const { data: allExpenses }  = await supabase.from('transactions').select('amount').eq('bank_account_id', account.id).eq('type', 'expense')
      const { data: allCCPayments} = await supabase.from('credit_card_payments').select('amount').eq('bank_account_id', account.id)

      const total_income        = (incomeTxs || []).reduce((s, t) => s + Number(t.amount), 0)
      const total_expenses      = (expenseTxs || []).reduce((s, t) => s + Number(t.amount), 0)
      const total_card_payments = (monthCardPayments || []).reduce((s, p) => s + Number(p.amount), 0)

      const cum_income   = (allIncome    || []).reduce((s, t) => s + Number(t.amount), 0)
      const cum_expenses = (allExpenses  || []).reduce((s, t) => s + Number(t.amount), 0)
      const cum_cc       = (allCCPayments|| []).reduce((s, p) => s + Number(p.amount), 0)

      return {
        ...account,
        total_income,
        total_expenses: total_expenses + total_card_payments,
        balance: cum_income - cum_expenses - cum_cc, // toujours cumulatif
      }
    })
  )

  return NextResponse.json(accountsWithBalance)
}

// POST /api/bank-accounts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, color, is_shared, owner_id } = await request.json()
  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      name,
      color: color || '#6366f1',
      is_shared: is_shared || false,
      owner_id: is_shared ? null : (owner_id || user.id),
      updated_by: user.id,
    })
    .select(`*, owner:profiles!bank_accounts_owner_id_fkey(id, display_name, avatar_color, avatar_url)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, total_income: 0, total_expenses: 0, balance: 0 }, { status: 201 })
}
