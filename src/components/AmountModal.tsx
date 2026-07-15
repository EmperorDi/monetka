import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { db, type Tx, type TxType } from '../db/schema'
import { todayISO } from '../lib/dates'
import { fmtNum, parseAmount } from '../lib/money'
import { useAccounts, useCategories, useCurrency, useIncomes } from '../state/hooks'
import { CoinBubble } from './CoinBubble'

export interface TxDraft {
  type: TxType
  fromId?: number
  toId?: number
}

interface Props {
  draft?: TxDraft
  tx?: Tx
  onClose: () => void
}

const TITLES: Record<TxType, string> = { income: 'Доход', expense: 'Расход', transfer: 'Перевод' }

/** «12345,6» → «12 345,6» — целая часть с разрядами, дробная как набрана */
function displayAmount(raw: string): string {
  if (raw === '') return '0'
  const [int, dec] = raw.split(',')
  const grouped = fmtNum(parseInt(int || '0', 10))
  return dec !== undefined ? `${grouped},${dec}` : grouped
}

export function AmountModal({ draft, tx, onClose }: Props) {
  const type: TxType = tx?.type ?? draft?.type ?? 'expense'
  const incomes = useIncomes()
  const accounts = useAccounts()
  const categories = useCategories()
  const currency = useCurrency()

  const [fromId, setFromId] = useState<number | undefined>(tx?.fromId ?? draft?.fromId)
  const [toId, setToId] = useState<number | undefined>(tx?.toId ?? draft?.toId)
  const [amount, setAmount] = useState<string>(tx ? String(tx.amount).replace('.', ',') : '')
  const [note, setNote] = useState<string>(tx?.note ?? '')
  const [date, setDate] = useState<string>(tx?.date ?? todayISO())
  const [mode, setMode] = useState<'amount' | 'pickFrom' | 'pickTo'>(() =>
    (tx?.toId ?? draft?.toId) == null ? 'pickTo' : 'amount',
  )

  const fromList = type === 'income' ? incomes : accounts
  const toList = type === 'income' ? accounts : type === 'expense' ? categories : accounts

  const from = useMemo(() => fromList.find((e) => e.id === fromId), [fromList, fromId])
  const to = useMemo(() => toList.find((e) => e.id === toId), [toList, toId])

  const value = parseAmount(amount)
  const canSave = value > 0 && fromId != null && toId != null && !(type === 'transfer' && fromId === toId)

  function press(key: string) {
    setAmount((a) => {
      if (key === '⌫') return a.slice(0, -1)
      if (key === ',') return a === '' ? '0,' : a.includes(',') ? a : a + ','
      const [, dec] = a.split(',')
      if (dec !== undefined && dec.length >= 2) return a
      if (a.replace(',', '').length >= 9) return a
      if (a === '0' && key !== ',') return key
      return a + key
    })
  }

  async function save() {
    if (!canSave) return
    const payload = {
      type,
      fromId: fromId!,
      toId: toId!,
      amount: value,
      date,
      note: note.trim() || undefined,
    }
    if (tx?.id != null) await db.transactions.update(tx.id, payload)
    else await db.transactions.add({ ...payload, createdAt: Date.now() })
    onClose()
  }

  async function remove() {
    if (tx?.id != null && window.confirm('Удалить операцию?')) {
      await db.transactions.delete(tx.id)
      onClose()
    }
  }

  const pickList = mode === 'pickFrom' ? fromList : toList
  const pickSel = mode === 'pickFrom' ? setFromId : setToId

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grip" />
        <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 10 }}>
          {TITLES[type]}
        </div>
        <div className="flow-chips">
          <button className={`flow-chip${mode === 'pickFrom' ? ' picking' : ''}`} onClick={() => setMode(mode === 'pickFrom' ? 'amount' : 'pickFrom')}>
            <span className="ico">{from?.icon ?? '❔'}</span>
            <span className="nm">{from?.name ?? 'Выбрать'}</span>
          </button>
          <span className="flow-arrow">→</span>
          <button className={`flow-chip${mode === 'pickTo' ? ' picking' : ''}`} onClick={() => setMode(mode === 'pickTo' ? 'amount' : 'pickTo')}>
            <span className="ico">{to?.icon ?? '❔'}</span>
            <span className="nm">{to?.name ?? 'Выбрать'}</span>
          </button>
        </div>

        {mode !== 'amount' ? (
          <div className="pick-grid">
            {pickList.map((e) => (
              <CoinBubble
                key={e.id}
                icon={e.icon}
                name={e.name}
                color={e.color}
                onClick={() => {
                  pickSel(e.id)
                  setMode('amount')
                }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className={`amount-display${value > 0 ? '' : ' zero'}`}>
              {displayAmount(amount)}
              <span className="cur">{currency}</span>
            </div>
            <div className="numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map((k) => (
                <button key={k} onClick={() => press(k)}>{k}</button>
              ))}
            </div>
            <div className="meta-row">
              <input
                type="text"
                placeholder="Заметка"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={80}
              />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="sheet-actions">
              {tx?.id != null && (
                <button className="btn-danger" onClick={remove} aria-label="Удалить">🗑</button>
              )}
              <button className="btn-primary" disabled={!canSave} onClick={save}>
                {tx?.id != null ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  )
}
