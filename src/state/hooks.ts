import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Tx } from '../db/schema'
import { monthRange } from '../lib/dates'

export function useCurrency(): string {
  const s = useLiveQuery(() => db.settings.get('currency'), [])
  return (s?.value as string) ?? '₽'
}

export function useIncomes() {
  return useLiveQuery(() => db.incomes.orderBy('order').toArray(), []) ?? []
}

export function useAccounts() {
  return useLiveQuery(() => db.accounts.orderBy('order').toArray(), []) ?? []
}

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? []
}

/** Транзакции выбранного месяца, свежие сверху */
export function useMonthTx(monthKey: string): Tx[] {
  return (
    useLiveQuery(async () => {
      const [from, to] = monthRange(monthKey)
      const list = await db.transactions.where('date').between(from, to, true, true).toArray()
      return list.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
    }, [monthKey]) ?? []
  )
}

/** Балансы счетов: начальный остаток + все операции за всю историю */
export function useBalances(): Map<number, number> {
  return (
    useLiveQuery(async () => {
      const [accounts, txs] = await Promise.all([db.accounts.toArray(), db.transactions.toArray()])
      const m = new Map<number, number>()
      for (const a of accounts) m.set(a.id!, a.initialBalance)
      for (const t of txs) {
        if (t.type === 'income') m.set(t.toId, (m.get(t.toId) ?? 0) + t.amount)
        else if (t.type === 'expense') m.set(t.fromId, (m.get(t.fromId) ?? 0) - t.amount)
        else {
          m.set(t.fromId, (m.get(t.fromId) ?? 0) - t.amount)
          m.set(t.toId, (m.get(t.toId) ?? 0) + t.amount)
        }
      }
      return m
    }, []) ?? new Map<number, number>()
  )
}

export interface MonthAgg {
  spentByCategory: Map<number, number>
  incomeBySource: Map<number, number>
  totalExpense: number
  totalIncome: number
}

export function monthAggOf(txs: Tx[]): MonthAgg {
  const spentByCategory = new Map<number, number>()
  const incomeBySource = new Map<number, number>()
  let totalExpense = 0
  let totalIncome = 0
  for (const t of txs) {
    if (t.type === 'expense') {
      spentByCategory.set(t.toId, (spentByCategory.get(t.toId) ?? 0) + t.amount)
      totalExpense += t.amount
    } else if (t.type === 'income') {
      incomeBySource.set(t.fromId, (incomeBySource.get(t.fromId) ?? 0) + t.amount)
      totalIncome += t.amount
    }
  }
  return { spentByCategory, incomeBySource, totalExpense, totalIncome }
}
