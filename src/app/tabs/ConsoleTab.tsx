import { AnimatePresence, motion } from 'framer-motion'
import {
  AudioLines,
  Eye,
  Network,
  Phone,
  ScanSearch,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useStore } from '../../store/store'
import { AGENTS } from '../../data/catalog'
import { WhatsAppThread } from '../../components/WhatsAppThread'
import { ActivityLog } from '../../components/ActivityLog'
import { TaskCard } from '../../components/TaskCard'
import { StageRail } from '../../components/StageRail'
import { RiskMeter } from '../../components/RiskMeter'
import { Badge, Chip, Empty, PanelHeader } from '../../components/ui'
import { HUE_HEX } from '../../lib/hues'
import { clsx, inrCompact, pct } from '../../lib/format'
import type { CaseView } from '../../types'

export function ConsoleTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  if (!c) return <Empty text="No active case — press play in the top bar." />

  return (
    <div className="space-y-6">
      <CaseHeader c={c} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left — WhatsApp + Action Center */}
        <div className="space-y-5 lg:col-span-4">
          <div className="panel h-[440px]">
            <WhatsAppThread messages={c.chat} />
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
        <div className="space-y-5 lg:col-span-5">
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
            <Chip className="!text-[10px]">{c.scenario === 'A' ? 'Case A · from scratch' : 'Case B · cited'}</Chip>
            {c.skillHit && (
              <Badge tone="ok">
                <Sparkles size={11} /> skill hit · {c.skillHit.source}
              </Badge>
            )}
          </div>
          <h2 className="mt-2 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900">
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
  return (
    <div className="panel p-4">
      <PanelHeader title="Perception · Vision (Gemini)" icon={<Eye size={15} />} className="!px-0 !py-0 pb-3" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-ink-900/[0.07] bg-ink-900/[0.02] p-3">
          <div className="flex items-center gap-2 text-[11px] text-ink-500">
            <ScanSearch size={13} /> Corrosion
          </div>
          <div className="mt-1 text-sm font-semibold text-ink-900">
            {p.corrosion.present ? `Present · ${p.corrosion.severity}` : 'None'}
          </div>
        </div>
        <div className="rounded-xl border border-ink-900/[0.07] bg-ink-900/[0.02] p-3">
          <div className="flex items-center gap-2 text-[11px] text-ink-500">
            <AudioLines size={13} /> Generator audio
          </div>
          <div className="mt-1 text-sm font-semibold text-ink-900">
            {p.generator_audio.anomaly === 'none'
              ? 'Normal'
              : `${p.generator_audio.anomaly} · ${pct(p.generator_audio.confidence)}`}
          </div>
        </div>
      </div>
      {c.asset_note && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.issues.map((i) => (
            <Chip key={i}>{i}</Chip>
          ))}
          <Chip className="text-ink-400">{c.asset_note}</Chip>
        </div>
      )}
    </div>
  )
}

function CrewStrip({ c }: { c: CaseView }) {
  if (!c.crewAssembled) return null
  return (
    <div className="panel p-4">
      <PanelHeader title="Crew" icon={<Network size={15} />} className="!px-0 !py-0 pb-3" />
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {AGENTS.map((def) => {
          const run = c.agents[def.id]
          const hex = HUE_HEX[def.hue]
          const on = run.status !== 'idle'
          const running = run.status === 'running'
          return (
            <div
              key={def.id}
              className={clsx(
                'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all',
                on ? 'border-ink-900/10 bg-ink-900/[0.03]' : 'border-ink-900/[0.06] opacity-40',
              )}
              style={running ? { boxShadow: `0 0 0 1px ${hex}66, 0 0 20px -6px ${hex}` } : undefined}
            >
              <span
                className={clsx('h-2 w-2 rounded-full', running && 'animate-pulse')}
                style={{ background: on ? hex : '#cbd0d6', boxShadow: on ? `0 0 8px ${hex}` : undefined }}
              />
              <span className="text-[10.5px] font-semibold leading-tight text-ink-700">{def.name}</span>
              <span className="text-[8.5px] uppercase tracking-wide text-ink-400">
                {run.status === 'done' ? '✓' : run.status === 'running' ? '···' : run.status === 'idle' ? '—' : '•'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
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
          {inv.systemic && <Badge tone="danger">systemic · {inv.fleet_affected} sites</Badge>}
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
