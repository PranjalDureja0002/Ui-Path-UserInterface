import { motion } from 'framer-motion'
import {
  ArrowRight,
  Fingerprint,
  Quote,
  Sparkles,
} from 'lucide-react'
import { useStore } from '../../store/store'
import { Badge, Chip, Empty, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import { TONE_HEX, type Tone } from '../../lib/hues'
import type { Skill, SkillStatus } from '../../types'

const STATUS_TONE: Record<SkillStatus, Tone> = {
  candidate: 'warn',
  trusted: 'ok',
  retired: 'muted',
  none: 'muted',
}

export function SkillsTab() {
  const skills = useStore((s) => s.skills)
  const list = Object.values(skills)
  const hasTrusted = list.some((s) => s.status === 'trusted')

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="Governed learning"
        title="Skills"
        sub="Every thumbs-up distills a reusable, cited recipe. Three approvals promotes it to trusted."
        right={
          list.length > 0 ? (
            <>
              <Chip>{list.length} learned</Chip>
              <Chip className="text-ok">{list.filter((s) => s.status === 'trusted').length} trusted</Chip>
            </>
          ) : undefined
        }
      />

      {/* Lifecycle strip */}
      <LifecycleStrip hasTrusted={hasTrusted} />

      {/* Skill cards */}
      {list.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<Sparkles size={22} />}
            text="Nothing learned yet — run Case A to its thumbs-up to write the first candidate skill."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((skill, i) => (
            <SkillCard key={skill.id} skill={skill} index={i} />
          ))}
        </div>
      )}

      {/* Smart matching explainer */}
      <SmartMatching />
    </div>
  )
}

// ── Lifecycle strip ─────────────────────────────────────────────────────────
function LifecycleStrip({ hasTrusted }: { hasTrusted: boolean }) {
  const stages: { label: string; sub: string; lit: boolean; tone: Tone }[] = [
    { label: 'Born', sub: 'candidate', lit: true, tone: 'warn' },
    { label: 'Reused', sub: 'matched + approved', lit: true, tone: 'info' },
    { label: 'Promoted', sub: 'trusted', lit: hasTrusted, tone: 'ok' },
    { label: 'Retired', sub: 'superseded', lit: false, tone: 'muted' },
  ]
  return (
    <div className="panel flex flex-wrap items-center gap-2 p-4">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div
            className={clsx(
              'flex flex-col rounded-xl border px-3.5 py-2 transition-all',
              s.lit
                ? 'border-ink-900/10 bg-ink-900/[0.03]'
                : 'border-ink-900/[0.06] bg-ink-900/[0.02] opacity-45',
            )}
          >
            <span
              className="text-[12.5px] font-semibold"
              style={{ color: s.lit ? TONE(s.tone) : undefined }}
            >
              {s.label}
            </span>
            <span className="text-[10.5px] text-ink-400">{s.sub}</span>
          </div>
          {i < stages.length - 1 && (
            <ArrowRight size={15} className="shrink-0 text-ink-300" />
          )}
        </div>
      ))}
    </div>
  )
}

function TONE(tone: Tone): string {
  return TONE_HEX[tone]
}

// ── Skill card ──────────────────────────────────────────────────────────────
function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  const tone = STATUS_TONE[skill.status]
  const hard: [string, string][] = [
    ['equipment_class', skill.match_key.equipment_class],
    ['component', skill.match_key.component],
    ['environment', skill.match_key.environment],
    ['spec', skill.match_key.spec],
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-ink-900/[0.07] bg-paper-50 p-4"
    >
      {/* Head */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-[13px] font-semibold text-ink-900">{skill.id}</div>
        <Badge tone={tone}>{skill.status}</Badge>
      </div>

      {/* Promotion progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wide text-ink-400">
            promotion
          </span>
          <span className="font-mono text-[11px] text-ink-500">
            approve_count {skill.approve_count}/3
          </span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {[0, 1, 2].map((i) => {
            const filled = i < skill.approve_count
            return (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{
                  background: filled ? TONE('ok') : 'rgba(255,255,255,0.06)',
                  boxShadow: filled ? `0 0 8px ${TONE('ok')}66` : undefined,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Diagnosis */}
      <div className="mt-3.5 text-[13px] leading-relaxed text-ink-700">{skill.diagnosis}</div>

      {/* Recipe */}
      {skill.recipe.length > 0 && (
        <div className="mt-3.5">
          <div className="text-[10.5px] uppercase tracking-wide text-ink-400">Recipe</div>
          <ol className="mt-1.5 space-y-1">
            {skill.recipe.map((step, i) => (
              <li
                key={i}
                className="flex gap-2.5 rounded-lg border border-ink-900/[0.06] bg-ink-900/[0.02] px-2.5 py-1.5"
              >
                <span className="font-mono text-[11px] font-semibold text-brand-600/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[11.5px] leading-relaxed text-ink-700">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Fingerprint / match key (hard) */}
      <div className="mt-3.5 rounded-xl border border-ink-900/[0.07] bg-ink-900/[0.02] p-3">
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-ink-400">
          <Fingerprint size={12} /> fingerprint
          <span className="ml-auto rounded-sm bg-brand-500/15 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-brand-600/80">
            hard
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {hard.map(([k, v]) => (
            <Chip key={k} className="!gap-1">
              <span className="text-ink-400">{k}</span>
              <span className="font-mono text-ink-700">{v}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* Source cases + citations */}
      {(skill.source_cases.length > 0 || skill.citations.length > 0) && (
        <div className="mt-3 space-y-2.5">
          {skill.source_cases.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] uppercase tracking-wide text-ink-400">
                from
              </span>
              {skill.source_cases.map((sc) => (
                <Chip key={sc} className="font-mono">
                  {sc}
                </Chip>
              ))}
            </div>
          )}
          {skill.citations.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {skill.citations.map((cite) => (
                <span
                  key={cite}
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink-900/[0.07] bg-paper-50 px-2 py-1 font-mono text-[10.5px] text-ink-500"
                >
                  <Quote size={11} className="text-brand-600/70" />
                  {cite}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Smart matching explainer ────────────────────────────────────────────────
function SmartMatching() {
  const hard = [
    { k: 'equipment_class', d: 'the kind of asset — never cross-applies' },
    { k: 'component', d: 'the failing part within it' },
    { k: 'capacity_band', d: 'sizing tier of the unit' },
    { k: 'failure_mode', d: 'the observed mode of failure' },
  ]
  const soft = [
    { k: 'environment', d: 'coastal / dry — colours the prior' },
    { k: 'vendor', d: 'who supplied it — a hint, not a gate' },
  ]
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-400/30 bg-brand-500/10 text-brand-600">
          <Fingerprint size={16} />
        </span>
        <div>
          <div className="text-sm font-semibold text-ink-900">Smart matching</div>
          <div className="text-[12px] text-ink-500">
            A skill only fires when its hard fingerprint matches exactly. Soft attributes can only
            move confidence — never open the gate.
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* HARD */}
        <div className="rounded-xl border border-brand-400/20 bg-brand-500/[0.05] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-600/85">
              Hard attributes
            </span>
            <Badge tone="info">hard gate</Badge>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
            Must match exactly. If any differs, the skill does not apply at all.
          </p>
          <div className="mt-3 space-y-2">
            {hard.map((h) => (
              <div
                key={h.k}
                className="flex items-baseline gap-2 rounded-lg border border-ink-900/[0.07] bg-ink-900/[0.02] px-2.5 py-1.5"
              >
                <span className="font-mono text-[11.5px] font-semibold text-ink-700">
                  {h.k}
                </span>
                <span className="text-[11px] text-ink-400">{h.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SOFT */}
        <div className="rounded-xl border border-ink-900/[0.07] bg-ink-900/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Soft attributes
            </span>
            <Badge tone="muted">confidence only</Badge>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
            Lowers confidence only — a soft mismatch never blocks a match.
          </p>
          <div className="mt-3 space-y-2">
            {soft.map((s) => (
              <div
                key={s.k}
                className="flex items-baseline gap-2 rounded-lg border border-ink-900/[0.06] bg-ink-900/[0.02] px-2.5 py-1.5"
              >
                <span className="font-mono text-[11.5px] font-semibold text-ink-700">
                  {s.k}
                </span>
                <span className="text-[11px] text-ink-400">{s.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
