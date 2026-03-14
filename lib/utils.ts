export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(new Date(year, m - 1, 1))
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) return "Aujourd'hui"
  if (isSameDay(date, yesterday)) return 'Hier'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
}

export function getInitials(displayName: string | null, email?: string): string {
  const name = displayName || email || '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function getScopeLabel(scope: string): string {
  const map: Record<string, string> = { personal: 'Personnel', common: 'Commun', shared: 'Partagé' }
  return map[scope] || scope
}

export function getProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export function groupByDate<T extends { created_at: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = item.created_at.split('T')[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function prevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 2, 1)
  return formatMonth(d)
}

export function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m, 1)
  return formatMonth(d)
}
