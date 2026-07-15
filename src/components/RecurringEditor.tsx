import { useState } from 'react'
import { createPortal } from 'react-dom'
import { db, type Recurring, type TxType } from '../db/schema'
import { todayISO } from '../lib/dates'
import { parseAmount } from '../lib/money'
import { useAccounts, useCategories, useIncomes } from '../state/hooks'

interface Props {
  rec?: Recurring
  onClose: () => void
}

export function RecurringEditor({ rec, onClose }: Props) {
  const incomes = useIncomes()
  const accounts = useAccounts()
  const categories = useCategories()

  const [type, setType] = useState<TxType>(rec?.type ?? 'expense')
  const [fromId, setFromId] = useState<number | undefined>(rec?.fromId)
  const [toId, setToId] = useState<number | undefined>(rec?.toId)
  const [amount, setAmount] = useState(rec ? String(rec.amount) : '')
  const [note, setNote] = useState(rec?.note ?? '')
  const [period, setPeriod] = useState<'weekly' | 'monthly'>(rec?.period ?? 'monthly')
  const [nextDate, setNextDate] = useState(rec?.nextDate ?? todayISO())
  const [enabled, setEnabled] = useState<boolean>(rec ? rec.enabled === 1 : true)

  const fromList = type === 'income' ? incomes : accounts
  const toList = type === 'income' ? accounts : type === 'expense' ? categories : accounts

  const value = parseAmount(amount)
  const canSave = value > 0 && fromId != null && toId != null && !(type === 'transfer' && fromId === toId)

  async function save() {
    if (!canSave) return
    const payload = {
      type, fromId: fromId!, toId: toId!, amount: value,
      note: note.trim() || undefined, period, nextDate,
      enabled: (enabled ? 1 : 0) as 0 | 1,
    }
    if (rec?.id != null) await db.recurring.update(rec.id, payload)
    else await db.recurring.add(payload)
    onClose()
  }

  async function remove() {
    if (rec?.id != null && window.confirm('Удалить повторяющийся платёж? Уже созданные операции останутся.')) {
      await db.recurring.delete(rec.id)
      onClose()
    }
  }

  function pickType(t: TxType) {
    setType(t)
    setFromId(undefined)
    setToId(undefined)
  }

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grip" />
        <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 14 }}>
          Повторяющийся платёж
        </div>

        <div className="form-field">
          <label>Тип</label>
          <select value={type} onChange={(e) => pickType(e.target.value as TxType)}>
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
            <option value="transfer">Перевод</option>
          </select>
        </div>

        <div className="form-field">
          <label>{type === 'income' ? 'Источник' : 'Со счёта'}</label>
          <select value={fromId ?? ''} onChange={(e) => setFromId(Number(e.target.value) || undefined)}>
            <option value="">— выбрать —</option>
            {fromList.map((x) => (
              <option key={x.id} value={x.id}>{x.icon} {x.name}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>{type === 'expense' ? 'Категория' : 'На счёт'}</label>
          <select value={toId ?? ''} onChange={(e) => setToId(Number(e.target.value) || undefined)}>
            <option value="">— выбрать —</option>
            {toList.map((x) => (
              <option key={x.id} value={x.id}>{x.icon} {x.name}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Сумма</label>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>

        <div className="form-field">
          <label>Заметка</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Например, аренда" />
        </div>

        <div className="form-field" style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Период</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly')}>
              <option value="monthly">Каждый месяц</option>
              <option value="weekly">Каждую неделю</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Следующая дата</label>
            <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 2px 14px', fontSize: 14 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
          Активен
        </label>

        <div className="sheet-actions">
          {rec?.id != null && (
            <button className="btn-danger" onClick={remove} aria-label="Удалить">🗑</button>
          )}
          <button className="btn-primary" disabled={!canSave} onClick={save}>
            {rec ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
