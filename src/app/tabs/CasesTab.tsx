import { motion } from 'framer-motion'
import { ArrowUpRight, History, MapPin, Plus, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/store'
import { Badge, Chip, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import { TONE_HEX, type Tone } from '../../lib/hues'
import { STAGES, type CaseView } from '../../types'

// The demo scenarios this queue can spawn (C — the MC4 solar case — leads).
const SCENARIO_META: Record<'A' | 'B' | 'C', { caseId: string; site: string }> = {
  C: { caseId: 'CASE-PV-0758', site: 'RJ-SOLAR-1' },
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

// ── Prior, resolved cases — a horizontal history across asset classes ────────
// (Static seed so the queue reads like a real enterprise console even before a
//  live case is driven in. The first two also surface as cards up top.)
type PriorCase = {
  id: string
  site: string
  vertical: string
  issue: string
  risk: number
  status: 'resolved' | 'closed'
  opened: string
  outcome: string
}

const PRIOR_CASES: PriorCase[] = [
  { id: 'CASE-WND-0512', site: 'GJ-WIND-2', vertical: 'Wind · turbine', issue: 'Gearbox bearing over-temperature', risk: 0.71, status: 'resolved', opened: '14 Jun', outcome: 'Crew dispatched · resolved' },
  { id: 'CASE-TWR-0473', site: 'DEL-COAST-4', vertical: 'Telecom · tower', issue: 'Coastal RF-jumper corrosion', risk: 0.82, status: 'closed', opened: '09 Jun', outcome: 'Skill promoted · trusted' },
  { id: 'CASE-IMM-2207', site: 'PLANT-W2', vertical: 'Manufacturing · moulder', issue: 'Auxiliary hydraulic vibration', risk: 0.54, status: 'resolved', opened: '05 Jun', outcome: 'Auto-resolved · no call' },
  { id: 'CASE-HVAC-1180', site: 'DC-NORTH-3', vertical: 'HVAC · chiller', issue: 'Compressor over-temp trip', risk: 0.61, status: 'closed', opened: '02 Jun', outcome: 'Work order raised' },
  { id: 'CASE-RAIL-3391', site: 'LINE-7 · KM42', vertical: 'Rail · signalling', issue: 'Intermittent point failure', risk: 0.47, status: 'closed', opened: '28 May', outcome: 'Trend flagged · monitored' },
]

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

  const openScenario = (id: 'A' | 'B' | 'C') => {
    loadScenario(id)
    navigate('/app/console')
  }

  const missing = (['C', 'A', 'B'] as const).filter(
    (id) => !order.includes(SCENARIO_META[id].caseId),
  )

  // Cards row: 2 prior cases, then live cases append as the 3rd / 4th card.
  const liveCases = order.map((id) => cases[id]).filter(Boolean) as CaseView[]
  const featured = PRIOR_CASES.slice(0, 2)
  const liveShown = liveCases.slice(0, Math.max(0, 4 - featured.length))

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="Case queue"
        title="Cases"
        sub="Every incident, from first signal to documented resolution — across every asset class."
        right={
          <>
            <Chip>{liveCases.length} live</Chip>
            {missing.map((id) => (
              <button
                key={id}
                onClick={() => openScenario(id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/[0.12] bg-white px-3.5 py-1.5 text-[11.5px] font-semibold tracking-tight text-ink-700 transition-all duration-150 hover:border-ink-900/25 hover:text-ink-900"
              >
                <Plus size={13} />
                Open Case {id} · {SCENARIO_META[id].site}
              </button>
            ))}
          </>
        }
      />

      {/* Cards row — 2 prior + live (a new case lands as the 3rd / 4th card) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((p, i) => (
          <PriorCard key={p.id} p={p} index={i} />
        ))}
        {liveShown.map((c, i) => (
          <CaseCard
            key={c.case_id}
            c={c}
            active={c.case_id === activeCaseId}
            index={featured.length + i}
            onOpen={open}
          />
        ))}
        {liveShown.length === 0 && <NewCaseGhost index={featured.length} />}
      </div>

      {/* Prior cases — resolved history */}
      <PriorTable rows={PRIOR_CASES} />
    </div>
  )
}

// ── Live case card (clickable → console) ─────────────────────────────────────
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

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(c.case_id)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={clsx(
        'card-raised relative flex w-full flex-col overflow-hidden text-left',
        active && '!border-brand-400/50 ring-1 ring-brand-400/30',
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div className="flex flex-1 flex-col p-5 pl-6">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded bg-brand-500/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> Live
          </span>
          <Badge tone={statusTone}>{c.status}</Badge>
        </div>
        <h3 className="mt-3 font-display text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink-900">
          {c.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-ink-500">
          <span>{c.case_id}</span>
          {c.site_id && (
            <>
              <span className="text-ink-300">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={10.5} className="text-ink-400" />
                {c.site_id}
              </span>
            </>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-900/[0.07] pt-3.5">
          <Chip className="text-ink-700">{stage?.label ?? c.stage}</Chip>
          <RiskPill score={c.risk_score} />
        </div>
      </div>
    </motion.button>
  )
}

// ── Prior (resolved) case card — static, history ─────────────────────────────
function PriorCard({ p, index }: { p: PriorCase; index: number }) {
  const accent = TONE_HEX['ok']
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card-raised relative flex flex-col overflow-hidden"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div className="flex flex-1 flex-col p-5 pl-6">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded bg-ink-900/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
            Prior
          </span>
          <Badge tone="ok">{p.status}</Badge>
        </div>
        <div className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">{p.vertical}</div>
        <h3 className="mt-0.5 font-display text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink-900">
          {p.issue}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-ink-500">
          <span>{p.id}</span>
          <span className="text-ink-300">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={10.5} className="text-ink-400" />
            {p.site}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-900/[0.07] pt-3.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
            <Sparkles size={12} className="text-ink-400" />
            {p.outcome}
          </span>
          <RiskPill score={p.risk} />
        </div>
      </div>
    </motion.div>
  )
}

// ── Placeholder for where a live case lands ──────────────────────────────────
function NewCaseGhost({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex min-h-[176px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/15 bg-ink-900/[0.012] p-5 text-center"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-ink-900/20 text-ink-400">
        <Plus size={16} />
      </div>
      <div className="mt-2.5 text-[12.5px] font-semibold text-ink-500">A new case lands here</div>
      <div className="mt-0.5 text-[11px] text-ink-400">Press play, or open a case above</div>
    </motion.div>
  )
}

function RiskPill({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-ink-400">Risk</span>
        <span className="font-mono text-[12px] text-ink-400">—</span>
      </div>
    )
  }
  const tone = riskTone(score)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-ink-400">Risk</span>
      <Badge tone={tone} className="font-mono">
        {score.toFixed(2)}
      </Badge>
    </div>
  )
}

// ── Resolved-history table ───────────────────────────────────────────────────
function PriorTable({ rows }: { rows: PriorCase[] }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-ink-900/[0.07] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-ink-900/[0.045] text-ink-500 ring-1 ring-inset ring-ink-900/[0.04]">
            <History size={15} />
          </span>
          <h3 className="text-[14.5px] font-semibold tracking-tight text-ink-900">Resolved history</h3>
        </div>
        <Chip>{rows.length} cases</Chip>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink-900/[0.07] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              <th className="px-5 py-2.5 font-semibold">Case</th>
              <th className="px-3 py-2.5 font-semibold">Asset class</th>
              <th className="px-3 py-2.5 font-semibold">Issue</th>
              <th className="px-3 py-2.5 font-semibold">Risk</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Opened</th>
              <th className="px-5 py-2.5 font-semibold">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-ink-900/[0.05] transition-colors last:border-0 hover:bg-ink-900/[0.015]"
              >
                <td className="px-5 py-3">
                  <div className="font-mono text-[12px] font-medium text-ink-900">{r.id}</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] text-ink-400">
                    <MapPin size={10} />
                    {r.site}
                  </div>
                </td>
                <td className="px-3 py-3 text-[12.5px] text-ink-600">{r.vertical}</td>
                <td className="px-3 py-3 text-[13px] font-medium text-ink-800">{r.issue}</td>
                <td className="px-3 py-3">
                  <Badge tone={riskTone(r.risk)} className="font-mono">
                    {r.risk.toFixed(2)}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </td>
                <td className="px-3 py-3 font-mono text-[11.5px] text-ink-500">{r.opened}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-600">
                    <ArrowUpRight size={12.5} className="text-ink-400" />
                    {r.outcome}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
