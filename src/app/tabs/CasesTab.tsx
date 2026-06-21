import { motion } from 'framer-motion'
import { Clock, MapPin, Plus, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/store'
import { Badge, Chip, Empty, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import { TONE_HEX, type Tone } from '../../lib/hues'
import { STAGES, type CaseView } from '../../types'

// The two demo scenarios this queue can spawn.
const SCENARIO_META: Record<'A' | 'B', { caseId: string; site: string }> = {
  A: { caseId: 'CASE-0916', site: 'DEL-0473' },
  B: { caseId: 'CASE-1042', site: 'MUM-0210' },
}

const STATUS_TONE: Record<CaseView['status'], Tone> = {
  open: 'info',
  parked: 'warn',
  resolved: 'ok',
  closed: 'ok',
}

function riskTone(score: number): Tone {
  if (score >= 0.7) return 'danger'
  if (score >= 0.45) return 'warn'
  return 'ok'
}

export function CasesTab() {
  const order = useStore((s) => s.order)
  const cases = useStore((s) => s.cases)
  const activeCaseId = useStore((s) => s.activeCaseId)
  const selectCase = useStore((s) => s.selectCase)
  const loadScenario = useStore((s) => s.loadScenario)
  const navigate = useNavigate()

  const open = (id: string) => {
    selectCase(id)
    navigate('/app/console')
  }

  const openScenario = (id: 'A' | 'B') => {
    loadScenario(id)
    navigate('/app/console')
  }

  const missing = (['A', 'B'] as const).filter(
    (id) => !order.includes(SCENARIO_META[id].caseId),
  )

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="Triage queue"
        title="Cases"
        sub="Every incident, from doorbell to documented resolution."
        right={
          <>
            <Chip>{order.length} open</Chip>
            {missing.map((id) => (
              <button
                key={id}
                onClick={() => openScenario(id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/[0.08] bg-ink-900/[0.02] px-3 py-1.5 text-[11.5px] font-medium text-ink-700 transition-colors hover:border-brand-400/40 hover:bg-brand-500/[0.08] hover:text-ink-900"
              >
                <Plus size={13} />
                Open Case {id} · {SCENARIO_META[id].site}
              </button>
            ))}
          </>
        }
      />

      {/* Queue */}
      {order.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<Clock size={22} />}
            text="No cases yet — press play in the top bar to open one."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {order.map((id, idx) => {
            const c = cases[id]
            if (!c) return null
            return <CaseCard key={id} c={c} active={id === activeCaseId} index={idx} onOpen={open} />
          })}
        </div>
      )}
    </div>
  )
}

function CaseCard({
  c,
  active,
  index,
  onOpen,
}: {
  c: CaseView
  active: boolean
  index: number
  onOpen: (id: string) => void
}) {
  const stage = STAGES.find((s) => s.id === c.stage)
  const statusTone = STATUS_TONE[c.status]
  const accent = TONE_HEX[statusTone]
  const hasMeta = Boolean(c.worker_name || c.opened_at)

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(c.case_id)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={clsx(
        'card-raised relative w-full overflow-hidden text-left',
        active && '!border-brand-400/50 ring-1 ring-brand-400/30',
      )}
    >
      {/* status accent rail */}
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />

      <div className="p-5 pl-6">
        {/* Top row — scenario + status */}
        <div className="flex items-center justify-between gap-3">
          <Chip className="!text-[10px]">{c.scenario === 'A' ? 'Case A' : 'Case B'}</Chip>
          <Badge tone={statusTone}>{c.status}</Badge>
        </div>

        {/* Title + id */}
        <h3 className="mt-3.5 font-display text-[19px] font-semibold leading-tight tracking-[-0.01em] text-ink-900">
          {c.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-ink-500">
          <span>{c.case_id}</span>
          {c.site_id && (
            <>
              <span className="text-ink-300">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} className="text-ink-400" />
                {c.site_id}
              </span>
            </>
          )}
        </div>

        {/* Meta — worker + opened (only when present) */}
        {hasMeta && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-600">
            {c.worker_name && (
              <span className="inline-flex items-center gap-1.5">
                <User size={12.5} className="text-ink-400" />
                {c.worker_name}
              </span>
            )}
            {c.opened_at && (
              <span className="inline-flex items-center gap-1.5 text-ink-500">
                <Clock size={12.5} className="text-ink-400" />
                opened {c.opened_at}
              </span>
            )}
          </div>
        )}

        {/* Footer — stage + risk */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-900/[0.07] pt-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Stage</span>
            <Chip className="text-ink-700">{stage?.label ?? c.stage}</Chip>
          </div>
          <RiskPill score={c.risk_score} />
        </div>
      </div>
    </motion.button>
  )
}

function RiskPill({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] uppercase tracking-wide text-ink-400">Risk</span>
        <span className="font-mono text-[12px] text-ink-400">—</span>
      </div>
    )
  }
  const tone = riskTone(score)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10.5px] uppercase tracking-wide text-ink-400">Risk</span>
      <Badge tone={tone} className="font-mono">
        {score.toFixed(2)}
      </Badge>
    </div>
  )
}
