function Bone({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: 'rgba(120,120,128,0.14)', ...style }}
    />
  )
}

function CardSkeleton() {
  return (
    <div className="ios-card p-5 space-y-2.5">
      <Bone className="h-3 w-20" />
      <Bone className="h-7 w-28" />
    </div>
  )
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="px-4 py-5 md:px-6 md:py-6 space-y-5">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden">
        <div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, #0a84ff, #bf5af2)',
            animation: 'nav-progress 1.4s ease-out forwards',
          }}
        />
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-36" />
        <Bone className="h-8 w-8 rounded-full" />
      </div>

      {/* Month selector placeholder */}
      <Bone className="h-8 w-48" />

      {/* Stat cards */}
      <div className={`grid grid-cols-2 md:grid-cols-${cards} gap-3`}>
        {Array.from({ length: cards }).map((_, i) => <CardSkeleton key={i} />)}
      </div>

      {/* Main content area */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="ios-card p-5 space-y-3">
          <Bone className="h-3 w-24" />
          <Bone className="h-48 w-full" />
        </div>
        <div className="ios-card p-5 space-y-3">
          <Bone className="h-3 w-24" />
          {[80, 65, 90, 50, 70].map((w, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <Bone className="h-3.5" style={{ width: `${w}%` } as React.CSSProperties} />
              <Bone className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes nav-progress {
          0%   { width: 0% }
          60%  { width: 75% }
          100% { width: 88% }
        }
      `}</style>
    </div>
  )
}
