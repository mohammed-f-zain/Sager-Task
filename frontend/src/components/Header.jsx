export default function Header() {
  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">SD</div>
        <h1 className="font-semibold text-gray-800">SagerSpace • Drone Tracing</h1>
      </div>
      <div className="text-xs text-gray-500">React • Tailwind • Mapbox • Socket.IO</div>
    </header>
  )
}