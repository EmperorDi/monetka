import { useMemo, useState } from 'react'
import type { Tx } from '../db/schema'
import { dayLabel } from '../lib/dates'
import { txView, useEntityMaps } from '../lib/entities'
import { fmtMoney, fmtNum } from '../lib/money'
import { useCurrency, useMonthTx } from '../state/hooks'
import { AmountModal } from './AmountModal'

export function Feed({ month }: { month: string }) {
  const txs = useMonthTx(month)
  const maps = useEntityMaps()
  const currency = useCurrency()
  const [editTx, setEditTx] = useState<Tx | null>(null)

  const days = useMemo(() => {
    const byDay = new Map<string, Tx[]>()
    for (const t of txs) {
      const list = byDay.get(t.date)
      if (list) list.push(t)
      else byDay.set(t.date, [t])
    }
    return [...byDay.entries()]
  }, [txs])

  return (
    <div className="screen">
      {days.length === 0 && (
        <div className="empty-state">
          <span className="big">🪙</span>
          Операций пока нет.
          <br />
          Перетащите монету на главном экране.
        </div>
      )}
      {days.map(([date, list]) => {
        const spent = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return (
          <div key={date}>
            <div className="feed-day-head">
              <span className="d">{dayLabel(date)}</span>
              {spent > 0 && <span className="s">− {fmtMoney(spent, currency)}</span>}
            </div>
            {list.map((t) => {
              const v = txView(t, maps)
              const cls = t.type === 'expense' ? 'exp' : t.type === 'income' ? 'inc' : 'trf'
              const sign = t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''
              return (
                <button
                  key={t.id}
                  className="tx-row"
                  style={{ '--coin': v.color } as React.CSSProperties}
                  onClick={() => setEditTx(t)}
                >
                  <span className="tx-ico">{v.icon}</span>
                  <span className="tx-main">
                    <span className="tx-title">{v.title}</span>
                    <br />
                    <span className="tx-sub">{v.sub}</span>
                  </span>
                  <span className={`tx-amt ${cls}`}>
                    {sign}{fmtNum(t.amount)} {currency}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
      {editTx && <AmountModal tx={editTx} onClose={() => setEditTx(null)} />}
    </div>
  )
}
