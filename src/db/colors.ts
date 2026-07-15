import { db } from './schema'

/**
 * Одноразовый перенос со старой (яркой) палитры на новую (приглушённую).
 * Обновляет только сущности, чей цвет точно совпадает со старым дефолтом,
 * — пользовательские цвета не трогает. Идемпотентно: после переноса старых
 * ключей не остаётся и повторный запуск ничего не делает.
 */
const REMAP: Record<string, string> = {
  '#43a047': '#3f9068',
  '#d95926': '#c6792e',
  '#3987e5': '#3f7fb4',
  '#9085e9': '#9166a8',
  '#d55181': '#cc5b45',
  '#12a5b8': '#0d949c',
  '#c98500': '#b5872f',
  '#7286e8': '#5a63cc',
  '#3ddc97': '#3f9068',
  '#4fc3f7': '#3f7fb4',
  '#f6c945': '#b5872f',
  '#ffb26b': '#0d949c',
}

let migrateOnce: Promise<void> | null = null

export function migrateColors(): Promise<void> {
  return (migrateOnce ??= doMigrate())
}

async function doMigrate(): Promise<void> {
  const done = await db.settings.get('colorsV2')
  if (done) return
  await db.transaction('rw', [db.incomes, db.accounts, db.categories, db.settings], async () => {
    for (const table of [db.incomes, db.accounts, db.categories]) {
      const rows = await table.toArray()
      for (const row of rows) {
        const next = REMAP[row.color?.toLowerCase()]
        if (next && next !== row.color) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (table as any).update(row.id, { color: next })
        }
      }
    }
    await db.settings.put({ key: 'colorsV2', value: true })
  })
}
