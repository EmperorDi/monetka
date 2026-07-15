import { db } from '../db/schema'
import { addPeriod, todayISO } from '../lib/dates'

let materializeOnce: Promise<number> | null = null

/** Один раз за запуск приложения (защита от двойного вызова эффекта в StrictMode) */
export function materializeRecurring(): Promise<number> {
  return (materializeOnce ??= doMaterialize())
}

/** Создаёт просроченные повторяющиеся операции и сдвигает nextDate вперёд */
async function doMaterialize(): Promise<number> {
  const today = todayISO()
  const due = await db.recurring.where('nextDate').belowOrEqual(today).and((r) => r.enabled === 1).toArray()
  let created = 0
  for (const r of due) {
    let date = r.nextDate
    // страховка от бесконечного цикла при испорченной дате
    let guard = 0
    while (date <= today && guard < 120) {
      await db.transactions.add({
        type: r.type,
        fromId: r.fromId,
        toId: r.toId,
        amount: r.amount,
        note: r.note,
        date,
        createdAt: Date.now(),
      })
      created++
      date = addPeriod(date, r.period)
      guard++
    }
    await db.recurring.update(r.id!, { nextDate: date })
  }
  return created
}
