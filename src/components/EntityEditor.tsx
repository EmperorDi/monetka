import { useState } from 'react'
import { createPortal } from 'react-dom'
import { db, type Account, type Category, type IncomeSource } from '../db/schema'
import { parseAmount } from '../lib/money'

export type EntityKind = 'income' | 'account' | 'category'

const KIND_TITLES: Record<EntityKind, [string, string]> = {
  income: ['Источник дохода', 'Новый источник'],
  account: ['Счёт', 'Новый счёт'],
  category: ['Категория', 'Новая категория'],
}

const COLORS = [
  '#43a047', '#3987e5', '#c98500', '#9085e9', '#d55181', '#12a5b8',
  '#d95926', '#7286e8', '#f6c945', '#ffb26b', '#3ddc97', '#4fc3f7',
]

const DEFAULT_ICONS: Record<EntityKind, string> = { income: '💰', account: '💳', category: '🧺' }

interface Props {
  kind: EntityKind
  entity?: IncomeSource | Account | Category
  onClose: () => void
}

export function EntityEditor({ kind, entity, onClose }: Props) {
  const [name, setName] = useState(entity?.name ?? '')
  const [icon, setIcon] = useState(entity?.icon ?? DEFAULT_ICONS[kind])
  const [color, setColor] = useState(entity?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)])
  const [balance, setBalance] = useState(
    kind === 'account' && entity ? String((entity as Account).initialBalance) : '',
  )
  const [budget, setBudget] = useState(
    kind === 'category' && entity && (entity as Category).budget != null ? String((entity as Category).budget) : '',
  )

  const table = kind === 'income' ? db.incomes : kind === 'account' ? db.accounts : db.categories
  const canSave = name.trim().length > 0

  async function save() {
    if (!canSave) return
    const base = { name: name.trim(), icon: icon.trim() || DEFAULT_ICONS[kind], color }
    const extra =
      kind === 'account'
        ? { initialBalance: parseAmount(balance) }
        : kind === 'category'
          ? { budget: budget.trim() === '' ? null : parseAmount(budget) }
          : {}
    if (entity?.id != null) {
      await table.update(entity.id, { ...base, ...extra })
    } else {
      const order = await table.count()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await table.add({ ...base, ...extra, order } as any)
    }
    onClose()
  }

  async function remove() {
    if (entity?.id == null) return
    const label = KIND_TITLES[kind][0].toLowerCase()
    if (!window.confirm(`Удалить ${label} «${entity.name}»? Операции с ним останутся в истории.`)) return
    await table.delete(entity.id)
    onClose()
  }

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grip" />
        <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 14 }}>
          {entity ? KIND_TITLES[kind][0] : KIND_TITLES[kind][1]}
        </div>

        <div className="form-field">
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Например, Продукты" />
        </div>

        <div className="form-field">
          <label>Иконка (эмодзи)</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} style={{ width: 90, textAlign: 'center', fontSize: 22 }} />
        </div>

        <div className="form-field">
          <label>Цвет</label>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch${c === color ? ' sel' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {kind === 'account' && (
          <div className="form-field">
            <label>Начальный остаток</label>
            <input inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />
          </div>
        )}

        {kind === 'category' && (
          <div className="form-field">
            <label>Бюджет на месяц (пусто — без бюджета)</label>
            <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Например, 15000" />
          </div>
        )}

        <div className="sheet-actions" style={{ marginTop: 16 }}>
          {entity?.id != null && (
            <button className="btn-danger" onClick={remove} aria-label="Удалить">🗑</button>
          )}
          <button className="btn-primary" disabled={!canSave} onClick={save}>
            {entity ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
