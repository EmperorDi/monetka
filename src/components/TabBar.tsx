export type Tab = 'board' | 'feed' | 'stats' | 'settings'

const ICONS: Record<Tab, React.ReactNode> = {
  board: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="3.4" />
      <circle cx="16.5" cy="9.5" r="2.6" />
      <circle cx="11.5" cy="16.5" r="3" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 7h14M5 12h14M5 17h9" />
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M15.5 3.8A9 9 0 0 1 20.2 8.5L15.5 10V3.8Z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </svg>
  ),
}

const LABELS: Record<Tab, string> = {
  board: 'Монеты',
  feed: 'Операции',
  stats: 'Статистика',
  settings: 'Настройки',
}

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar">
      {(Object.keys(LABELS) as Tab[]).map((t) => (
        <button key={t} className={t === tab ? 'active' : ''} onClick={() => onChange(t)}>
          {ICONS[t]}
          {LABELS[t]}
        </button>
      ))}
    </nav>
  )
}
