import { db, type Tx } from '../db/schema'
import { todayISO } from './dates'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function exportJSON(): Promise<void> {
  const [accounts, incomes, categories, transactions, recurring, settings] = await Promise.all([
    db.accounts.toArray(),
    db.incomes.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.recurring.toArray(),
    db.settings.toArray(),
  ])
  const dump = {
    app: 'monetka',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts, incomes, categories, transactions, recurring, settings,
  }
  download(
    new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' }),
    `monetka-backup-${todayISO()}.json`,
  )
}

export async function exportCSV(): Promise<void> {
  const [accounts, incomes, categories, transactions] = await Promise.all([
    db.accounts.toArray(),
    db.incomes.toArray(),
    db.categories.toArray(),
    db.transactions.orderBy('date').toArray(),
  ])
  const accName = new Map(accounts.map((a) => [a.id!, a.name]))
  const incName = new Map(incomes.map((i) => [i.id!, i.name]))
  const catName = new Map(categories.map((c) => [c.id!, c.name]))
  const typeLabel: Record<Tx['type'], string> = { income: 'Доход', expense: 'Расход', transfer: 'Перевод' }

  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const rows = transactions.map((t) => {
    const from = t.type === 'income' ? incName.get(t.fromId) : accName.get(t.fromId)
    const to = t.type === 'expense' ? catName.get(t.toId) : accName.get(t.toId)
    return [t.date, typeLabel[t.type], from ?? 'Удалено', to ?? 'Удалено', String(t.amount).replace('.', ','), t.note ?? '']
      .map(esc)
      .join(';')
  })
  // BOM, чтобы Excel корректно распознал UTF-8
  const csv = '﻿' + ['Дата;Тип;Откуда;Куда;Сумма;Заметка', ...rows].join('\r\n')
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `monetka-${todayISO()}.csv`)
}

export async function importJSON(file: File): Promise<string> {
  const text = await file.text()
  const dump = JSON.parse(text)
  if (dump?.app !== 'monetka' || !Array.isArray(dump.transactions)) {
    throw new Error('файл не похож на резервную копию Монетки')
  }
  if (!window.confirm('Импорт полностью заменит текущие данные. Продолжить?')) {
    throw new Error('отменено')
  }
  await db.transaction('rw', [db.accounts, db.incomes, db.categories, db.transactions, db.recurring, db.settings], async () => {
    await Promise.all([
      db.accounts.clear(), db.incomes.clear(), db.categories.clear(),
      db.transactions.clear(), db.recurring.clear(), db.settings.clear(),
    ])
    await db.accounts.bulkAdd(dump.accounts ?? [])
    await db.incomes.bulkAdd(dump.incomes ?? [])
    await db.categories.bulkAdd(dump.categories ?? [])
    await db.transactions.bulkAdd(dump.transactions ?? [])
    await db.recurring.bulkAdd(dump.recurring ?? [])
    await db.settings.bulkAdd(dump.settings ?? [])
  })
  return `${(dump.transactions ?? []).length} операций, ${(dump.categories ?? []).length} категорий`
}
