import { useEffect } from 'react'
import Header from './components/Header'
import SidePanel from './components/SidePanel'
import MapView from './components/MapView'
import CounterBadge from './components/CounterBadge'
import { startSocket } from './socket'
import { useDroneStore } from './store'

export default function App() {
  const counts = useDroneStore(s => s.counts())

  useEffect(() => {
    startSocket()
  }, [])

  return (
    <div className="h-full flex flex-col">
      <Header />
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[320px,1fr]">
        <SidePanel onSelect={(d)=>{}} />
        <section className="relative">
          <MapView />
        </section>
      </main>
      <CounterBadge redCount={counts.red} />
    </div>
  )
}