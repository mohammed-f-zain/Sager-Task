export default function CounterBadge({ redCount = 0 }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-soft px-4 py-2">
        <div className="text-sm text-gray-500">Red (Not Allowed)</div>
        <div className="text-3xl font-bold text-red-600 text-center">{redCount}</div>
      </div>
    </div>
  )
}