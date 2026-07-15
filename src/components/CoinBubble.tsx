import type { CSSProperties, PointerEvent as RPointerEvent } from 'react'

export interface CoinBubbleProps {
  icon: string
  name: string
  color: string
  sub?: string
  subOver?: boolean
  /** 0..1+ — доля бюджета; null/undefined — без кольца */
  ringPct?: number | null
  registerRef?: (el: HTMLDivElement | null) => void
  onPointerDown?: (e: RPointerEvent<HTMLDivElement>) => void
  onClick?: () => void
  dragSource?: boolean
  dropTarget?: boolean
}

function ringColor(pct: number): string {
  if (pct >= 1) return 'var(--red)'
  if (pct >= 0.75) return '#ffb26b'
  return 'var(--green)'
}

export function CoinBubble({
  icon, name, color, sub, subOver, ringPct,
  registerRef, onPointerDown, onClick, dragSource, dropTarget,
}: CoinBubbleProps) {
  const style: CSSProperties & Record<string, string> = { '--coin': color }
  if (ringPct != null) {
    const deg = Math.min(ringPct, 1) * 360
    style['--ring'] = `conic-gradient(${ringColor(ringPct)} ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)`
  }
  return (
    <div
      className={`coin${dragSource ? ' drag-source' : ''}${dropTarget ? ' drop-target' : ''}`}
      style={style}
      ref={registerRef}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className="coin-ring">
        <div className="coin-face">{icon}</div>
      </div>
      <div className="coin-name">{name}</div>
      {sub !== undefined && <div className={`coin-sum${subOver ? ' over' : ''}`}>{sub}</div>}
    </div>
  )
}

export function AddCoin({ onClick, label = 'Добавить' }: { onClick: () => void; label?: string }) {
  return (
    <div className="coin add-coin" onClick={onClick}>
      <div className="coin-ring" style={{ background: 'transparent' }}>
        <div className="coin-face">＋</div>
      </div>
      <div className="coin-name" style={{ color: 'var(--faint)' }}>{label}</div>
    </div>
  )
}
