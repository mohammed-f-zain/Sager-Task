import { useDroneStore } from '../store'
import { formatDuration } from '../utils/format'
import clsx from 'clsx'

export default function SidePanel({ onSelect }) {
  const list = useDroneStore(s => s.list())
  const selected = useDroneStore(s => s.selected)
  const select = useDroneStore(s => s.select)

  return (
    <aside className="w-full md:w-80 border-r bg-white h-full overflow-y-auto scroll-thin">
      <div className="p-3 border-b sticky top-0 bg-white z-10">
        <div className="text-sm text-gray-500">Drones in the sky</div>
        <div className="text-lg font-semibold">{list.length}</div>
      </div>
      <ul className="divide-y">
        {list.map(d => (
          <li key={d.serial}>
            <button
              onClick={() => { select(d.serial); onSelect?.(d) }}
              className={clsx("w-full text-left p-3 hover:bg-gray-50 transition", selected === d.serial && "bg-brand-50")}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-800">{d.serial}</div>
                <span className={clsx("text-xs px-2 py-1 rounded-full", d.allowed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {d.allowed ? "Allowed" : "Not Allowed"}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Reg: <span className="font-mono">{d.registration}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex gap-3">
                <span>Alt: <span className="font-medium text-gray-700">{d.altitude} m</span></span>
                <span>Yaw: <span className="font-medium text-gray-700">{d.yaw}°</span></span>
                <span>Flight: <span className="font-medium text-gray-700">{formatDuration(Date.now() - d.firstSeen)}</span></span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}