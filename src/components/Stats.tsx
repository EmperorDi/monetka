import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../db/schema'
import { monthLabelShort, monthRange, shiftMonthKey } from '../lib/dates'
import { fmtCompact, fmtMoney, fmtNum } from '../lib/money'
import { monthAggOf, useCategories, useCurrency, useMonthTx } from '../state/hooks'

/** Сегмент donut: дуга с зазором 2px, отрисованная stroke'ом */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

function roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h)
  return `M ${x} ${y + h} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h} Z`
}

export function Stats({ month }: { month: string }) {
  const txs = useMonthTx(month)
  const categories = useCategories()
  const currency = useCurrency()
  const agg = useMemo(() => monthAggOf(txs), [txs])
  const [activeBar, setActiveBar] = useState<number | null>(null)

  // расходы по категориям, по убыванию; хвост после 7 позиций сворачивается в «Прочее»
  const slices = useMemo(() => {
    const rows = categories
      .map((c) => ({ name: c.name, color: c.color, icon: c.icon, value: agg.spentByCategory.get(c.id!) ?? 0 }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
    if (rows.length > 8) {
      const rest = rows.slice(7)
      return [
        ...rows.slice(0, 7),
        { name: 'Прочее', color: '#9c9384', icon: '•', value: rest.reduce((s, r) => s + r.value, 0) },
      ]
    }
    return rows
  }, [categories, agg])

  // динамика: 6 месяцев, заканчивая выбранным
  const monthKeys = useMemo(
    () => Array.from({ length: 6 }, (_, i) => shiftMonthKey(month, i - 5)),
    [month],
  )
  const monthly =
    useLiveQuery(async () => {
      const [from] = monthRange(monthKeys[0])
      const [, to] = monthRange(monthKeys[5])
      const list = await db.transactions
        .where('date')
        .between(from, to, true, true)
        .and((t) => t.type === 'expense')
        .toArray()
      const sums = new Map<string, number>()
      for (const t of list) sums.set(t.date.slice(0, 7), (sums.get(t.date.slice(0, 7)) ?? 0) + t.amount)
      return monthKeys.map((k) => sums.get(k) ?? 0)
    }, [monthKeys]) ?? monthKeys.map(() => 0)

  const total = agg.totalExpense
  const maxMonthly = Math.max(...monthly, 1)
  const maxIdx = monthly.indexOf(Math.max(...monthly))

  // геометрия donut
  const R = 62
  const C = 80
  const gapRad = total > 0 ? 2 / R : 0 // ~2px зазор между сегментами
  let angle = -Math.PI / 2

  // геометрия баров
  const BW = 320
  const BH = 150
  const plotH = 108
  const barW = 30
  const step = BW / 6

  return (
    <div className="screen">
      <div className="stat-card" style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
        {[
          ['Доходы', agg.totalIncome, 'var(--green)'],
          ['Расходы', agg.totalExpense, 'var(--text)'],
          ['Разница', agg.totalIncome - agg.totalExpense, agg.totalIncome - agg.totalExpense >= 0 ? 'var(--green)' : 'var(--red)'],
        ].map(([label, val, color]) => (
          <div key={label as string} style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: color as string, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
              {fmtCompact(val as number)}
            </div>
          </div>
        ))}
      </div>

      <div className="stat-card">
        <h3>Расходы по категориям</h3>
        {slices.length === 0 ? (
          <div className="empty-state" style={{ padding: '28px 10px' }}>Расходов в этом месяце нет</div>
        ) : (
          <>
            <svg viewBox="0 0 160 160" style={{ width: 180, display: 'block', margin: '0 auto' }} role="img" aria-label="Расходы по категориям">
              {slices.map((s) => {
                const frac = s.value / total
                const a0 = angle
                const sweep = Math.max(frac * Math.PI * 2 - gapRad, 0.02)
                angle += frac * Math.PI * 2
                return (
                  <path
                    key={s.name}
                    d={arcPath(C, C, R, a0, a0 + sweep)}
                    stroke={s.color}
                    strokeWidth="24"
                    strokeLinecap="butt"
                    fill="none"
                  />
                )
              })}
              <text x={C} y={C - 4} textAnchor="middle" fill="var(--text)" fontSize="15" fontWeight="600" fontFamily="var(--font-display)">
                {fmtCompact(total)}
              </text>
              <text x={C} y={C + 14} textAnchor="middle" fill="var(--faint)" fontSize="9.5">
                {currency} за месяц
              </text>
            </svg>
            <div style={{ marginTop: 10 }}>
              {slices.map((s) => (
                <div className="legend-row" key={s.name}>
                  <span className="legend-dot" style={{ background: s.color }} />
                  <span className="legend-name">{s.icon} {s.name}</span>
                  <span className="legend-val">{fmtMoney(s.value, currency)}</span>
                  <span className="legend-pct">{Math.round((s.value / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="stat-card">
        <h3>Расходы за 6 месяцев</h3>
        <svg viewBox={`0 0 ${BW} ${BH}`} style={{ width: '100%' }} role="img" aria-label="Расходы по месяцам">
          <line x1="0" x2={BW} y1={plotH + 14} y2={plotH + 14} stroke="var(--border)" strokeWidth="1" />
          {monthly.map((v, i) => {
            const h = Math.max((v / maxMonthly) * plotH, v > 0 ? 3 : 0)
            const x = i * step + (step - barW) / 2
            const y = plotH + 14 - h
            const isSel = monthKeys[i] === month
            const labeled = activeBar === i || (activeBar === null && (i === maxIdx || isSel))
            return (
              <g key={monthKeys[i]} onClick={() => setActiveBar(activeBar === i ? null : i)} style={{ cursor: 'pointer' }}>
                <rect x={i * step} y={0} width={step} height={BH} fill="transparent" />
                {v > 0 && (
                  <path d={roundedTopBar(x, y, barW, h, 4)} fill={isSel ? 'var(--gold)' : 'color-mix(in srgb, var(--gold) 38%, var(--surface-3))'} />
                )}
                {labeled && v > 0 && (
                  <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="var(--muted)" fontSize="10.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNum(Math.round(v))}
                  </text>
                )}
                <text x={x + barW / 2} y={BH - 2} textAnchor="middle" fill={isSel ? 'var(--text)' : 'var(--faint)'} fontSize="10.5">
                  {monthLabelShort(monthKeys[i])}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
