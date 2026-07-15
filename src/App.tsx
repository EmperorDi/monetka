import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { CoinBoard } from './components/CoinBoard'
import { Feed } from './components/Feed'
import { Settings } from './components/Settings'
import { Stats } from './components/Stats'
import { TabBar, type Tab } from './components/TabBar'
import { seedIfEmpty } from './db/seed'
import { currentMonthKey } from './lib/dates'
import { materializeRecurring } from './state/recurring'

export default function App() {
  const [tab, setTab] = useState<Tab>('board')
  const [month, setMonth] = useState(currentMonthKey())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await seedIfEmpty()
      await materializeRecurring()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const screen = useMemo(() => {
    switch (tab) {
      case 'board':
        return <CoinBoard month={month} />
      case 'feed':
        return <Feed month={month} />
      case 'stats':
        return <Stats month={month} />
      case 'settings':
        return <Settings />
    }
  }, [tab, month])

  if (!ready) return null

  return (
    <>
      {tab !== 'settings' && <AppHeader month={month} onMonth={setMonth} />}
      {screen}
      <TabBar tab={tab} onChange={setTab} />
    </>
  )
}
