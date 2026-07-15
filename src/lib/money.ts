const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export function fmtNum(n: number): string {
  return nf.format(Math.round(n * 100) / 100)
}

export function fmtMoney(n: number, symbol: string): string {
  return `${fmtNum(n)} ${symbol}`
}

export function fmtSigned(n: number, symbol: string): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${fmtNum(Math.abs(n))} ${symbol}`
}

/** Компактная запись для монет: 12 400 → «12,4 к» */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${nf.format(Math.round(n / 100_000) / 10)} млн`
  if (abs >= 10_000) return `${nf.format(Math.round(n / 100) / 10)} к`
  return fmtNum(n)
}

export function parseAmount(s: string): number {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
