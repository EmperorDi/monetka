import { db } from './schema'

let seedOnce: Promise<void> | null = null

/** Идемпотентно: повторные вызовы (в т.ч. параллельные из StrictMode) не дублируют сид */
export function seedIfEmpty(): Promise<void> {
  return (seedOnce ??= doSeed())
}

async function doSeed(): Promise<void> {
  const count = await db.accounts.count()
  if (count > 0) return

  await db.transaction('rw', [db.accounts, db.incomes, db.categories, db.settings], async () => {
    await db.incomes.bulkAdd([
      { name: 'Зарплата', icon: '💼', color: '#3f9068', order: 0 },
      { name: 'Подработка', icon: '💡', color: '#3f7fb4', order: 1 },
    ])
    await db.accounts.bulkAdd([
      { name: 'Карта', icon: '💳', color: '#b5872f', initialBalance: 0, order: 0 },
      { name: 'Наличные', icon: '👛', color: '#0d949c', initialBalance: 0, order: 1 },
    ])
    // Приглушённая самоцветная палитра — проверена валидатором (dataviz):
    // lightness, chroma, CVD-разделение и контраст на светлой И тёмной
    // поверхности — все PASS. См. также migrateColors в colors.ts.
    await db.categories.bulkAdd([
      { name: 'Продукты', icon: '🛒', color: '#3f9068', budget: null, order: 0 },
      { name: 'Кафе', icon: '☕️', color: '#c6792e', budget: null, order: 1 },
      { name: 'Транспорт', icon: '🚌', color: '#3f7fb4', budget: null, order: 2 },
      { name: 'Дом', icon: '🏠', color: '#9166a8', budget: null, order: 3 },
      { name: 'Здоровье', icon: '💊', color: '#cc5b45', budget: null, order: 4 },
      { name: 'Одежда', icon: '👕', color: '#0d949c', budget: null, order: 5 },
      { name: 'Развлечения', icon: '🎬', color: '#b5872f', budget: null, order: 6 },
      { name: 'Связь', icon: '📱', color: '#5a63cc', budget: null, order: 7 },
    ])
    await db.settings.put({ key: 'currency', value: '₽' })
  })
}
