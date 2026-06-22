import { AnimatePresence, motion } from 'framer-motion'
import {
  AudioLines,
  Eye,
  FileText,
  Flame,
  Network,
  Phone,
  ScanSearch,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/store'
import { WhatsAppThread } from '../../components/WhatsAppThread'
import { ActivityLog } from '../../components/ActivityLog'
import { TaskCard } from '../../components/TaskCard'
import { StageRail } from '../../components/StageRail'
import { RiskMeter } from '../../components/RiskMeter'
import { Badge, Chip, Empty, PanelHeader } from '../../components/ui'
import { CREW_ICON } from '../../data/crewIcons'
import { ALWAYS_ON, SPECIALISTS, invocationFor, type CrewAgent } from '../../data/crew'
import { clsx, inrCompact, pct } from '../../lib/format'
import type { CaseView, PerceptionFinding } from '../../types'

const MODALITY_ICON = { image: ScanSearch, audio: AudioLines, thermal: Flame, text: FileText } as const

export function ConsoleTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  if (!c) return <Empty text="No active case — press play in the top bar." />

  return (
    <div className="space-y-7">
      <CaseHeader c={c} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left — WhatsApp + Action Center */}
        <div className="space-y-6 lg:col-span-4">
          <div className="panel h-[460px] overflow-hidden">
            <WhatsAppThread messages={c.chat} name={c.worker_name} phone={c.worker_phone} />
          </div>
          {c.tasks.length > 0 && (
            <div className="space-y-3">
              {c.tasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>

        {/* Center — findings */}
        <div className="space-y-6 lg:col-span-5">
          <SkillBanner c={c} />
          <PerceptionCard c={c} />
          <CrewStrip c={c} />
          <InvestigationCard c={c} />
          <CallDecision c={c} />
        </div>

        {/* Right — live activity */}
        <div className="lg:col-span-3">
          <div className="panel sticky top-[136px] flex h-[640px] flex-col">
            <PanelHeader
              title="Live activity"
              icon={<AudioLines size={15} />}
              right={<Chip>{c.log.length} events</Chip>}
              className="border-b border-ink-900/[0.07]"
            />
            <div className="min-h-0 flex-1">
              <ActivityLog entries={c.log} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CaseHeader({ c }: { c: CaseView }) {
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Chip className="!text-[10px]">
              {c.scenario === 'A'
                ? 'Case A · from scratch'
                : c.scenario === 'B'
                  ? 'Case B · cited'
                  : 'Case C · MC4 cross-mating'}
            </Chip>
            {c.skillHit && (
              <Badge tone="ok">
                <Sparkles size={11} /> skill hit · {c.skillHit.source}
              </Badge>
            )}
          </div>
          <h2 className="mt-3 font-serif text-[26px] font-normal leading-[1.12] tracking-[-0.012em] text-ink-900 sm:text-[30px]">
            {c.title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-500">
            <span>{c.case_id}</span>
            <span className="text-ink-300">·</span>
            <span>{c.site_id}</span>
            <span className="text-ink-300">·</span>
            <span>{c.worker_name}</span>
            <span className="text-ink-300">·</span>
            <span>opened {c.opened_at}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <MetricMini label="Exposure / hr" value={c.investigation ? inrCompact(c.investigation.exposure_per_hr ?? 0) : '—'} tone="warn" />
          <MetricMini label="Fleet affected" value={c.fleet ? String(c.fleet.affected.length) : '—'} tone="danger" />
          <MetricMini label="Confidence" value={c.investigation ? pct(c.investigation.confidence) : '—'} tone="ok" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_280px]">
        <StageRail stage={c.stage} status={c.status} />
        <RiskMeter value={c.risk_score} />
      </div>
    </div>
  )
}

function MetricMini({ label, value, tone }: { label: string; value: string; tone: 'warn' | 'danger' | 'ok' }) {
  const color = { warn: '#c77b08', danger: '#e23b3b', ok: '#1aa251' }[tone]
  return (
    <div className="rounded-xl border border-ink-900/[0.08] bg-paper-50 px-3.5 py-2.5 text-center">
      <div className="font-display text-[19px] font-bold leading-none tracking-tightest" style={{ color }}>
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-400">{label}</div>
    </div>
  )
}

function SkillBanner({ c }: { c: CaseView }) {
  if (!c.skillHit && !c.skillWritten) {
    if (c.stage === 'perceive' && c.scenario === 'A')
      return (
        <div className="rounded-2xl border border-warn/25 bg-warn/[0.05] px-4 py-3 text-[12.5px] text-ink-700">
          <span className="font-semibold text-warn">No skill matched</span> — nothing learned yet. The
          crew will reason from scratch.
        </div>
      )
    return null
  }
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-2xl border border-ok/30 bg-ok/[0.06] px-4 py-3"
      >
        <Sparkles size={18} className="shrink-0 text-ok" />
        <div className="text-[12.5px] text-ink-700">
          {c.skillHit ? (
            <>
              <span className="font-semibold text-ok">Seen this before.</span> Matched{' '}
              <span className="font-mono">{c.skillHit.id}</span> ({c.skillHit.status}) from{' '}
              <span className="font-mono">{c.skillHit.source}</span> — passed the hard gate.
            </>
          ) : (
            <>
              <span className="font-semibold text-ok">New skill written.</span> Distilled{' '}
              <span className="font-mono">{c.skillWritten!.id}</span> as a candidate.
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function PerceptionCard({ c }: { c: CaseView }) {
  if (!c.perception) return null
  const p = c.perception
  // Prefer the horizontal findings list; fall back to the legacy telecom fields.
  const findings: PerceptionFinding[] =
    p.findings ?? [
      ...(p.corrosion
        ? [{
            modality: 'image' as const,
            label: 'Corrosion',
            detail: p.corrosion.present ? `present · ${p.corrosion.severity}` : 'none',
            severity: p.corrosion.present ? p.corrosion.severity : undefined,
          }]
        : []),
      ...(p.generator_audio
        ? [{
            modality: 'audio' as const,
            label: 'Generator audio',
            detail:
              p.generator_audio.anomaly === 'none'
                ? 'normal'
                : `${p.generator_audio.anomaly} · ${pct(p.generator_audio.confidence)}`,
          }]
        : []),
    ]
  return (
    <div className="panel p-4">
      <PanelHeader title="Perception · Vision" icon={<Eye size={15} />} className="!px-0 !py-0 pb-3" />
      <div className={clsx('grid gap-3', findings.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
        {findings.map((f, i) => {
          const Icon = MODALITY_ICON[f.modality] ?? ScanSearch
          const hot = f.severity === 'high' || f.severity === 'critical'
          return (
            <div
              key={i}
              className="rounded-xl border border-ink-900/[0.07] bg-ink-900/[0.02] p-3"
              style={hot ? { borderColor: '#e23b3b40', background: '#e23b3b0a' } : undefined}
            >
              <div className="flex items-center gap-2 text-[11px] text-ink-500">
                <Icon size={13} /> {f.label}
              </div>
              <div className="mt-1 text-sm font-semibold" style={{ color: hot ? '#e23b3b' : '#14171c' }}>
                {f.detail ?? (f.confidence != null ? pct(f.confidence) : '—')}
              </div>
            </div>
          )
        })}
      </div>
      {(c.asset_note || p.issues.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.issues.map((i) => (
            <Chip key={i}>{i}</Chip>
          ))}
          {c.asset_note && <Chip className="text-ink-400">{c.asset_note}</Chip>}
        </div>
      )}
    </div>
  )
}

type CrewStatus = 'queued' | 'running' | 'done'

function CrewStrip({ c }: { c: CaseView }) {
  if (!c.crewAssembled && !c.reachedStages.includes('perceive')) return null
  const { invoked, skipped } = invocationFor(c.scenario)
  const byId = Object.fromEntries(SPECIALISTS.map((s) => [s.id, s]))
  const past = (['escalate', 'resolve', 'close'] as const).some((s) => c.reachedStages.includes(s))
  const atInvestigate = c.reachedStages.includes('investigate')
  const specStatus: CrewStatus = past ? 'done' : atInvestigate ? 'running' : 'queued'
  const brainStatus: CrewStatus = atInvestigate ? 'done' : 'running'

  return (
    <div className="panel p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
          <Network size={14} className="text-ink-400" />
          Crew · assembled for this case
        </div>
        <Link to="/app/crew" className="text-[11px] font-medium text-ink-400 transition-colors hover:text-ink-700">
          all {SPECIALISTS.length} →
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CrewChip agent={ALWAYS_ON} status={brainStatus} brain />
        {invoked.map((inv) => {
          const a = byId[inv.id]
          return a ? <CrewChip key={inv.id} agent={a} status={specStatus} /> : null
        })}
        {skipped.length > 0 && (
          <span className="rounded-full border border-ink-900/[0.07] bg-paper-50 px-2.5 py-1 text-[10.5px] text-ink-400">
            +{skipped.length} held back
          </span>
        )}
      </div>
    </div>
  )
}

function CrewChip({ agent, status, brain }: { agent: CrewAgent; status: CrewStatus; brain?: boolean }) {
  const Icon = CREW_ICON[agent.id] ?? Network
  const accent = agent.safety ? '#c77b08' : '#2f6dff'
  const dot = status === 'done' ? '#1aa251' : status === 'running' ? accent : '#cbd0d6'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-ink-700"
      style={{ borderColor: `${accent}${brain ? '4d' : '2b'}`, background: brain ? `${accent}14` : `${accent}08` }}
    >
      <Icon size={13} style={{ color: accent }} />
      {agent.short}
      <span
        className={clsx('h-1.5 w-1.5 rounded-full', status === 'running' && 'animate-pulse')}
        style={{ background: dot, boxShadow: status !== 'queued' ? `0 0 6px ${dot}` : undefined }}
      />
    </span>
  )
}

function InvestigationCard({ c }: { c: CaseView }) {
  if (!c.investigation) return null
  const inv = c.investigation
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel p-4">
      <PanelHeader title="Merged recommendation" icon={<TriangleAlert size={15} />} className="!px-0 !py-0 pb-3" />
      <div className="rounded-xl border border-brand-400/20 bg-brand-500/[0.06] p-3.5">
        <div className="text-[11px] uppercase tracking-wide text-ink-400">Root cause</div>
        <div className="mt-0.5 text-[14px] font-semibold text-ink-900">{inv.root_cause}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="ok">confidence {pct(inv.confidence)}</Badge>
          {inv.systemic && (
            <Badge tone="danger">
              systemic · {inv.fleet_affected} {c.fleet?.unitNoun ?? 'site'}s
            </Badge>
          )}
          {inv.alternatives_ruled_out.map((a) => (
            <Chip key={a}>ruled out · {a}</Chip>
          ))}
        </div>
        <div className="mt-3 border-t border-ink-900/[0.07] pt-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-400">Recommendation</div>
          <div className="mt-0.5 text-[13px] text-ink-900">{inv.recommendation}</div>
        </div>
      </div>
    </motion.div>
  )
}

function CallDecision({ c }: { c: CaseView }) {
  const d = c.call.decision
  if (!d) return null
  return (
    <div className="panel flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ok/15 text-ok">
        <Phone size={18} />
      </div>
      <div className="text-[12.5px]">
        <div className="font-semibold text-ink-900">
          Authorised by voice · {d.by} @ {d.at}
        </div>
        <div className="text-ink-500">
          {d.actions.map((a) => (
            <span key={a} className="mr-1.5 font-mono text-[11px] text-ok">
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
