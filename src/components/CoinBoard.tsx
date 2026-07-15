import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { fmtCompact } from '../lib/money'
import { monthAggOf, useAccounts, useBalances, useCategories, useIncomes, useMonthTx } from '../state/hooks'
import { AmountModal, type TxDraft } from './AmountModal'
import { AddCoin, CoinBubble } from './CoinBubble'
import { EntityEditor, type EntityKind } from './EntityEditor'

type SrcKind = 'income' | 'account'
type TargetKind = 'account' | 'category'

interface DragState {
  srcKind: SrcKind
  srcId: number
  icon: string
  color: string
  x: number
  y: number
  overKey: string | null
}

interface TargetInfo {
  el: HTMLElement
  kind: TargetKind
  id: number
}

export function CoinBoard({ month }: { month: string }) {
  const incomes = useIncomes()
  const accounts = useAccounts()
  const categories = useCategories()
  const balances = useBalances()
  const txs = useMonthTx(month)
  const agg = useMemo(() => monthAggOf(txs), [txs])

  const [drag, setDrag] = useState<DragState | null>(null)
  const [draft, setDraft] = useState<TxDraft | null>(null)
  const [addKind, setAddKind] = useState<EntityKind | null>(null)
  const targets = useRef(new Map<string, TargetInfo>())

  const registerTarget = (kind: TargetKind, id: number) => (el: HTMLDivElement | null) => {
    const key = `${kind}:${id}`
    if (el) targets.current.set(key, { el, kind, id })
    else targets.current.delete(key)
  }

  function hitTest(x: number, y: number, srcKind: SrcKind, srcId: number): string | null {
    for (const [key, t] of targets.current) {
      const valid =
        srcKind === 'income'
          ? t.kind === 'account'
          : t.kind === 'category' || (t.kind === 'account' && t.id !== srcId)
      if (!valid) continue
      const r = t.el.getBoundingClientRect()
      const pad = 8
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return key
    }
    return null
  }

  function startPointer(src: { kind: SrcKind; id: number; icon: string; color: string }, tapAction: () => void) {
    return (e: RPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const el = e.currentTarget
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // синтетические события (тесты) не имеют активного указателя
      }
      const startX = e.clientX
      const startY = e.clientY
      let started = false

      const onMove = (ev: PointerEvent) => {
        if (!started && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) started = true
        if (!started) return
        ev.preventDefault()
        const overKey = hitTest(ev.clientX, ev.clientY, src.kind, src.id)
        setDrag({ srcKind: src.kind, srcId: src.id, icon: src.icon, color: src.color, x: ev.clientX, y: ev.clientY, overKey })
      }

      const onUp = (ev: PointerEvent) => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onCancel)
        setDrag(null)
        if (!started) {
          tapAction()
          return
        }
        const overKey = hitTest(ev.clientX, ev.clientY, src.kind, src.id)
        if (!overKey) return
        const t = targets.current.get(overKey)!
        if (src.kind === 'income') setDraft({ type: 'income', fromId: src.id, toId: t.id })
        else if (t.kind === 'category') setDraft({ type: 'expense', fromId: src.id, toId: t.id })
        else setDraft({ type: 'transfer', fromId: src.id, toId: t.id })
      }

      const onCancel = () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onCancel)
        setDrag(null)
      }

      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onCancel)
    }
  }

  const firstAccount = accounts[0]?.id

  return (
    <div className="screen">
      <div className="section-label">Доходы</div>
      <div className="coin-row">
        {incomes.map((s) => (
          <CoinBubble
            key={s.id}
            icon={s.icon}
            name={s.name}
            color={s.color}
            sub={fmtCompact(agg.incomeBySource.get(s.id!) ?? 0)}
            dragSource={drag?.srcKind === 'income' && drag.srcId === s.id}
            onPointerDown={startPointer(
              { kind: 'income', id: s.id!, icon: s.icon, color: s.color },
              () => firstAccount != null && setDraft({ type: 'income', fromId: s.id, toId: firstAccount }),
            )}
          />
        ))}
        <AddCoin onClick={() => setAddKind('income')} />
      </div>

      <div className="section-label">Счета</div>
      <div className="coin-row">
        {accounts.map((a) => (
          <CoinBubble
            key={a.id}
            icon={a.icon}
            name={a.name}
            color={a.color}
            sub={fmtCompact(balances.get(a.id!) ?? 0)}
            registerRef={registerTarget('account', a.id!)}
            dragSource={drag?.srcKind === 'account' && drag.srcId === a.id}
            dropTarget={drag?.overKey === `account:${a.id}`}
            onPointerDown={startPointer(
              { kind: 'account', id: a.id!, icon: a.icon, color: a.color },
              () => setDraft({ type: 'expense', fromId: a.id }),
            )}
          />
        ))}
        <AddCoin onClick={() => setAddKind('account')} />
      </div>

      <div className="section-label">Расходы</div>
      <div className="coin-row">
        {categories.map((c) => {
          const spent = agg.spentByCategory.get(c.id!) ?? 0
          const pct = c.budget ? spent / c.budget : null
          return (
            <CoinBubble
              key={c.id}
              icon={c.icon}
              name={c.name}
              color={c.color}
              sub={fmtCompact(spent)}
              subOver={pct != null && pct >= 1}
              ringPct={pct}
              registerRef={registerTarget('category', c.id!)}
              dropTarget={drag?.overKey === `category:${c.id}`}
              onClick={() =>
                !drag && firstAccount != null && setDraft({ type: 'expense', fromId: firstAccount, toId: c.id })
              }
            />
          )
        })}
        <AddCoin onClick={() => setAddKind('category')} />
      </div>

      {drag && (
        <div
          className="drag-ghost"
          style={{ left: drag.x, top: drag.y, '--coin': drag.color } as React.CSSProperties}
        >
          {drag.icon}
        </div>
      )}

      {draft && <AmountModal draft={draft} onClose={() => setDraft(null)} />}
      {addKind && <EntityEditor kind={addKind} onClose={() => setAddKind(null)} />}
    </div>
  )
}
