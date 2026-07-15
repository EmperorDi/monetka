import { useMemo } from 'react'
import { monthLabel, shiftMonthKey } from '../lib/dates'
import { fmtMoney } from '../lib/money'
import { monthAggOf, useCurrency, useMonthTx } from '../state/hooks'

export function AppHeader({ month, onMonth }: { month: string; onMonth: (m: string) => void }) {
  const txs = useMonthTx(month)
  const currency = useCurrency()
  const agg = useMemo(() => monthAggOf(txs), [txs])

  return (
    <header className="app-header" style={{ padding: 'calc(var(--safe-top) + 14px) 16px 0' }}>
      <div className="month-switch">
        <button onClick={() => onMonth(shiftMonthKey(month, -1))} aria-label="Предыдущий месяц">‹</button>
        <span className="month-title">{monthLabel(month)}</span>
        <button onClick={() => onMonth(shiftMonthKey(month, 1))} aria-label="Следующий месяц">›</button>
      </div>
      <div className="header-totals">
        <div className="spent">− {fmtMoney(agg.totalExpense, currency)}</div>
        <div className="label">расходы за месяц</div>
      </div>
    </header>
  )
}
