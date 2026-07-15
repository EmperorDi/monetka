import { useMemo } from 'react'
import type { Account, Category, IncomeSource, Tx } from '../db/schema'
import { useAccounts, useCategories, useIncomes } from '../state/hooks'

export interface EntityMaps {
  incomeById: Map<number, IncomeSource>
  accountById: Map<number, Account>
  categoryById: Map<number, Category>
}

export function useEntityMaps(): EntityMaps {
  const incomes = useIncomes()
  const accounts = useAccounts()
  const categories = useCategories()
  return useMemo(
    () => ({
      incomeById: new Map(incomes.map((i) => [i.id!, i])),
      accountById: new Map(accounts.map((a) => [a.id!, a])),
      categoryById: new Map(categories.map((c) => [c.id!, c])),
    }),
    [incomes, accounts, categories],
  )
}

export interface TxView {
  icon: string
  color: string
  title: string
  sub: string
}

const GONE = { name: 'Удалено', icon: '❔', color: '#5a6280' }

export function txView(t: Tx, maps: EntityMaps): TxView {
  if (t.type === 'income') {
    const src = maps.incomeById.get(t.fromId) ?? GONE
    const acc = maps.accountById.get(t.toId) ?? GONE
    return {
      icon: src.icon, color: src.color, title: src.name,
      sub: [`→ ${acc.name}`, t.note].filter(Boolean).join(' · '),
    }
  }
  if (t.type === 'expense') {
    const acc = maps.accountById.get(t.fromId) ?? GONE
    const cat = maps.categoryById.get(t.toId) ?? GONE
    return {
      icon: cat.icon, color: cat.color, title: cat.name,
      sub: [acc.name, t.note].filter(Boolean).join(' · '),
    }
  }
  const from = maps.accountById.get(t.fromId) ?? GONE
  const to = maps.accountById.get(t.toId) ?? GONE
  return {
    icon: '🔁', color: '#4fc3f7', title: `${from.name} → ${to.name}`,
    sub: t.note ?? 'Перевод',
  }
}
