import { FastForward, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useStore } from '../store/store'
import { SCENARIOS } from '../data/scenarios'
import { STAGES } from '../types'
import { clsx } from '../lib/format'

const SPEEDS = [1, 2, 4]

export function ReplayControls() {
  const replay = useStore((s) => s.replay)
  const activeCase = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  const loadScenario = useStore((s) => s.loadScenario)
  const togglePlay = useStore((s) => s.togglePlay)
  const restart = useStore((s) => s.restart)
  const setSpeed = useStore((s) => s.setSpeed)
  const jumpToEnd = useStore((s) => s.jumpToEnd)

  const duration = SCENARIOS[replay.scenarioId].durationMs
  const progress = Math.min(100, (replay.cursorMs / duration) * 100)
  const stageLabel = activeCase ? STAGES.find((s) => s.id === activeCase.stage)?.label ?? '—' : '—'

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(replay.speed)
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length])
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Scenario switch */}
      <div className="flex items-center rounded-full border border-ink-900/[0.08] bg-white p-1 shadow-card-soft">
        {(['A', 'B'] as const).map((id) => (
          <button
            key={id}
            onClick={() => loadScenario(id)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
              replay.scenarioId === id
                ? 'bg-brand-500 text-white shadow-glow'
                : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {id === 'A' ? 'Case A · DEL-0473' : 'Case B · MUM-0210'}
          </button>
        ))}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-1 rounded-full border border-ink-900/[0.08] bg-white p-1 shadow-card-soft">
        <IconBtn title="Restart" onClick={restart}>
          <RotateCcw size={14} />
        </IconBtn>
        <button
          onClick={togglePlay}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
          title={replay.playing ? 'Pause' : 'Play'}
        >
          {replay.playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>
        <IconBtn title="Skip to end" onClick={jumpToEnd}>
          <SkipForward size={14} />
        </IconBtn>
        <button
          onClick={cycleSpeed}
          className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
          title="Playback speed"
        >
          <FastForward size={12} />
          {replay.speed}×
        </button>
      </div>

      {/* Progress + stage */}
      <div className="flex min-w-[180px] flex-1 items-center gap-3">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-900/[0.08]">
          <div
            className="h-full rounded-full bg-brand-sheen transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="whitespace-nowrap font-mono text-[11px] text-ink-500">
          {replay.finished ? 'done' : stageLabel}
        </span>
      </div>
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-900/[0.06] hover:text-ink-900"
    >
      {children}
    </button>
  )
}
