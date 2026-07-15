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
      { name: 'Зарплата', icon: '💼', color: '#3ddc97', order: 0 },
      { name: 'Подработка', icon: '💡', color: '#4fc3f7', order: 1 },
    ])
    await db.accounts.bulkAdd([
      { name: 'Карта', icon: '💳', color: '#f6c945', initialBalance: 0, order: 0 },
      { name: 'Наличные', icon: '👛', color: '#ffb26b', initialBalance: 0, order: 1 },
    ])
    // Палитра категорий проверена валидатором (dataviz): lightness band,
    // chroma, CVD-разделение и контраст на тёмной поверхности — все PASS.
    await db.categories.bulkAdd([
      { name: 'Продукты', icon: '🛒', color: '#43a047', budget: null, order: 0 },
      { name: 'Кафе', icon: '☕️', color: '#d95926', budget: null, order: 1 },
      { name: 'Транспорт', icon: '🚌', color: '#3987e5', budget: null, order: 2 },
      { name: 'Дом', icon: '🏠', color: '#9085e9', budget: null, order: 3 },
      { name: 'Здоровье', icon: '💊', color: '#d55181', budget: null, order: 4 },
      { name: 'Одежда', icon: '👕', color: '#12a5b8', budget: null, order: 5 },
      { name: 'Развлечения', icon: '🎬', color: '#c98500', budget: null, order: 6 },
      { name: 'Связь', icon: '📱', color: '#7286e8', budget: null, order: 7 },
    ])
    await db.settings.put({ key: 'currency', value: '₽' })
  })
}
