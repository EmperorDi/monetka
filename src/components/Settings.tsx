import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { db, type Account, type Category, type IncomeSource, type Recurring } from '../db/schema'
import { txView, useEntityMaps } from '../lib/entities'
import { fmtMoney } from '../lib/money'
import { useAccounts, useBalances, useCategories, useCurrency, useIncomes } from '../state/hooks'
import { EntityEditor, type EntityKind } from './EntityEditor'
import { RecurringEditor } from './RecurringEditor'
import { exportCSV, exportJSON, importJSON } from '../lib/backup'
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme'

const PERIOD_LABEL = { weekly: 'каждую неделю', monthly: 'каждый месяц' } as const

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Система' },
]

export function Settings() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref())
  const incomes = useIncomes()
  const accounts = useAccounts()
  const categories = useCategories()
  const balances = useBalances()
  const currency = useCurrency()
  const maps = useEntityMaps()
  const recurring = useLiveQuery(() => db.recurring.toArray(), []) ?? []

  const [editor, setEditor] = useState<{ kind: EntityKind; entity?: IncomeSource | Account | Category } | null>(null)
  const [recEditor, setRecEditor] = useState<{ rec?: Recurring } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onImport(file: File) {
    try {
      const summary = await importJSON(file)
      window.alert(`Импорт завершён: ${summary}`)
    } catch (e) {
      window.alert(`Не удалось импортировать: ${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <div className="screen">
      <div className="section-label" style={{ marginTop: 6 }}>Оформление</div>
      <div className="segmented">
        {THEME_OPTIONS.map((o) => (
          <button
            key={o.value}
            className={theme === o.value ? 'active' : ''}
            onClick={() => {
              setTheme(o.value)
              setThemePref(o.value)
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="section-label">Счета</div>
      {accounts.map((a) => (
        <button key={a.id} className="set-item" style={{ '--coin': a.color } as React.CSSProperties} onClick={() => setEditor({ kind: 'account', entity: a })}>
          <span className="ico">{a.icon}</span>
          <span className="nm">{a.name}</span>
          <span className="val">{fmtMoney(balances.get(a.id!) ?? 0, currency)}</span>
        </button>
      ))}
      <button className="set-item" onClick={() => setEditor({ kind: 'account' })}>
        <span className="ico">＋</span>
        <span className="nm" style={{ color: 'var(--muted)' }}>Добавить счёт</span>
      </button>

      <div className="section-label">Источники дохода</div>
      {incomes.map((s) => (
        <button key={s.id} className="set-item" style={{ '--coin': s.color } as React.CSSProperties} onClick={() => setEditor({ kind: 'income', entity: s })}>
          <span className="ico">{s.icon}</span>
          <span className="nm">{s.name}</span>
        </button>
      ))}
      <button className="set-item" onClick={() => setEditor({ kind: 'income' })}>
        <span className="ico">＋</span>
        <span className="nm" style={{ color: 'var(--muted)' }}>Добавить источник</span>
      </button>

      <div className="section-label">Категории расходов</div>
      {categories.map((c) => (
        <button key={c.id} className="set-item" style={{ '--coin': c.color } as React.CSSProperties} onClick={() => setEditor({ kind: 'category', entity: c })}>
          <span className="ico">{c.icon}</span>
          <span className="nm">{c.name}</span>
          <span className="val">{c.budget != null ? `бюджет ${fmtMoney(c.budget, currency)}` : 'без бюджета'}</span>
        </button>
      ))}
      <button className="set-item" onClick={() => setEditor({ kind: 'category' })}>
        <span className="ico">＋</span>
        <span className="nm" style={{ color: 'var(--muted)' }}>Добавить категорию</span>
      </button>

      <div className="section-label">Повторяющиеся платежи</div>
      {recurring.map((r) => {
        const v = txView({ ...r, date: r.nextDate, createdAt: 0 }, maps)
        return (
          <button key={r.id} className="set-item" style={{ '--coin': v.color, opacity: r.enabled ? 1 : 0.45 } as React.CSSProperties} onClick={() => setRecEditor({ rec: r })}>
            <span className="ico">{v.icon}</span>
            <span className="nm">
              {v.title}
              <br />
              <span style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 400 }}>
                {PERIOD_LABEL[r.period]}, ближайший {r.nextDate.split('-').reverse().join('.')}
              </span>
            </span>
            <span className="val">{fmtMoney(r.amount, currency)}</span>
          </button>
        )
      })}
      <button className="set-item" onClick={() => setRecEditor({})}>
        <span className="ico">＋</span>
        <span className="nm" style={{ color: 'var(--muted)' }}>Добавить платёж</span>
      </button>

      <div className="section-label">Валюта</div>
      <div className="set-item" style={{ cursor: 'default' }}>
        <span className="ico">💱</span>
        <span className="nm">Символ валюты</span>
        <input
          value={currency}
          onChange={(e) => db.settings.put({ key: 'currency', value: e.target.value || '₽' })}
          maxLength={4}
          style={{ width: 64, textAlign: 'center', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 0', fontSize: 15, userSelect: 'text', WebkitUserSelect: 'text' }}
        />
      </div>

      <div className="section-label">Данные</div>
      <button className="set-item" onClick={exportJSON}>
        <span className="ico">📤</span>
        <span className="nm">Экспорт резервной копии (JSON)</span>
      </button>
      <button className="set-item" onClick={exportCSV}>
        <span className="ico">📊</span>
        <span className="nm">Экспорт операций (CSV)</span>
      </button>
      <button className="set-item" onClick={() => fileRef.current?.click()}>
        <span className="ico">📥</span>
        <span className="nm">Импорт из резервной копии</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onImport(f)
          e.target.value = ''
        }}
      />

      <div className="note-box">
        🔒 Все данные хранятся только на этом устройстве и никуда не отправляются.
        iOS может очистить хранилище Safari, если приложением долго не пользоваться, —
        время от времени делайте экспорт резервной копии.
      </div>

      {editor && <EntityEditor kind={editor.kind} entity={editor.entity} onClose={() => setEditor(null)} />}
      {recEditor && <RecurringEditor rec={recEditor.rec} onClose={() => setRecEditor(null)} />}
    </div>
  )
}
