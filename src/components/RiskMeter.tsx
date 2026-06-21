import { clsx } from '../lib/format'

// Horizontal risk bar 0..1 with the 0.7 call-threshold marked.
export function RiskMeter({ value, className }: { value: number | null; className?: string }) {
  const v = value ?? 0
  const pctV = Math.round(v * 100)
  const high = v >= 0.7
  const color = value === null ? '#969ca5' : high ? '#e23b3b' : v >= 0.45 ? '#c77b08' : '#1aa251'

  return (
    <div className={clsx('w-full', className)}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-500">Risk score</span>
        <span className="font-display text-lg font-bold tracking-tightest" style={{ color }}>
          {value === null ? '—' : v.toFixed(2)}
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink-900/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pctV}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
        />
        {/* 0.7 threshold marker */}
        <div className="absolute inset-y-0" style={{ left: '70%' }}>
          <div className="h-full w-[2px] bg-ink-900/35" />
        </div>
      </div>
      <div className="relative mt-1 h-3 text-[10px] text-ink-400">
        <span className="absolute" style={{ left: '70%', transform: 'translateX(-50%)' }}>
          0.70 · call
        </span>
      </div>
    </div>
  )
}
