import Dexie, { type Table } from 'dexie'

export interface Account {
  id?: number
  name: string
  icon: string
  color: string
  initialBalance: number
  order: number
}

export interface IncomeSource {
  id?: number
  name: string
  icon: string
  color: string
  order: number
}

export interface Category {
  id?: number
  name: string
  icon: string
  color: string
  budget: number | null
  order: number
}

export type TxType = 'income' | 'expense' | 'transfer'

/**
 * Семантика fromId/toId зависит от type:
 *  income:   fromId = IncomeSource, toId = Account
 *  expense:  fromId = Account,      toId = Category
 *  transfer: fromId = Account,      toId = Account
 */
export interface Tx {
  id?: number
  type: TxType
  fromId: number
  toId: number
  amount: number
  date: string // YYYY-MM-DD
  note?: string
  createdAt: number
}

export interface Recurring {
  id?: number
  type: TxType
  fromId: number
  toId: number
  amount: number
  note?: string
  period: 'weekly' | 'monthly'
  nextDate: string // YYYY-MM-DD
  enabled: 0 | 1
}

export interface Setting {
  key: string
  value: unknown
}

export class MonetkaDB extends Dexie {
  accounts!: Table<Account, number>
  incomes!: Table<IncomeSource, number>
  categories!: Table<Category, number>
  transactions!: Table<Tx, number>
  recurring!: Table<Recurring, number>
  settings!: Table<Setting, string>

  constructor() {
    super('monetka')
    this.version(1).stores({
      accounts: '++id, order',
      incomes: '++id, order',
      categories: '++id, order',
      transactions: '++id, date, type, fromId, toId',
      recurring: '++id, nextDate, enabled',
      settings: 'key',
    })
  }
}

export const db = new MonetkaDB()
