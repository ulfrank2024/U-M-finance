'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useFetch } from '@/hooks/useFetch'
import { formatMonth } from '@/lib/utils'
import type { BalanceResponse, Transaction, Project } from '@/lib/types'
import BalanceCard from '@/components/BalanceCard'
import TransactionCard from '@/components/TransactionCard'
import ProjectCard from '@/components/ProjectCard'
import MonthPicker from '@/components/ui/MonthPicker'
import EmptyState from '@/components/ui/EmptyState'

export default function DashboardPage() {
  const [month, setMonth] = useState(() => formatMonth(new Date()))

  const { data: balance, loading: bLoading } = useFetch<BalanceResponse>(`/api/balance?month=${month}`)
  const { data: transactions } = useFetch<Transaction[]>(`/api/transactions?month=${month}`)
  const { data: projects } = useFetch<Project[]>('/api/projects')

  const recent = (transactions || []).slice(0, 5)
  const activeProjects = (projects || []).filter(p => p.status === 'active').slice(0, 3)

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#fafafa]">U&M Finance 💑</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Tableau de bord</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Balance */}
      {bLoading ? (
        <div className="h-40 bg-[#18181b] rounded-2xl animate-pulse" />
      ) : balance ? (
        <BalanceCard data={balance} />
      ) : null}

      {/* Stats rapides */}
      {balance && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#18181b] rounded-2xl p-3 border border-[#3f3f46]">
            <p className="text-[11px] text-[#a1a1aa] mb-1">Revenus</p>
            <p className="text-base font-bold text-[#22c55e]">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(balance.couple_total.income)}
            </p>
          </div>
          <div className="bg-[#18181b] rounded-2xl p-3 border border-[#3f3f46]">
            <p className="text-[11px] text-[#a1a1aa] mb-1">Dépenses</p>
            <p className="text-base font-bold text-[#ef4444]">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(balance.couple_total.total_expenses)}
            </p>
          </div>
        </div>
      )}

      {/* Projets */}
      {activeProjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#fafafa]">Projets en cours</h2>
            <Link href="/projects" className="text-xs text-[#e879f9]">Voir tout</Link>
          </div>
          <div className="space-y-2">
            {activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {/* Dernières transactions */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#fafafa]">Dernières transactions</h2>
          <Link href="/transactions" className="text-xs text-[#e879f9]">Voir tout</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon="💳" title="Aucune transaction" description="Ajoutez votre première dépense ou revenu" />
        ) : (
          <div className="space-y-2">
            {recent.map(t => <TransactionCard key={t.id} transaction={t} />)}
          </div>
        )}
      </section>
    </div>
  )
}
