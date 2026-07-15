export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** «2026-07» из даты */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const now = new Date()
  const label = MONTHS[m - 1]
  return y === now.getFullYear() ? label : `${label} ${y}`
}

export function monthLabelShort(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const now = new Date()
  return y === now.getFullYear() ? MONTHS_SHORT[m - 1] : `${MONTHS_SHORT[m - 1]} ’${String(y).slice(2)}`
}

/** Диапазон дат месяца [from, to] включительно для запросов по индексу date */
export function monthRange(key: string): [string, string] {
  return [`${key}-01`, `${key}-31`]
}

export function dayLabel(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Сегодня'
  const d = new Date(iso + 'T12:00:00')
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (iso === toISO(yest)) return 'Вчера'
  const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()]
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${wd}`
}

export function addPeriod(iso: string, period: 'weekly' | 'monthly'): string {
  const d = new Date(iso + 'T12:00:00')
  if (period === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return toISO(d)
}
