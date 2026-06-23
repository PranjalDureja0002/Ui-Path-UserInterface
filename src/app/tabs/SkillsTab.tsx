import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Fingerprint, Quote, Sparkles } from 'lucide-react'
import { useStore } from '../../store/store'
import { Badge, Chip, Empty, TabHeader } from '../../components/ui'
import { SkillFileModal, skillFileExists } from '../../components/SkillFileModal'
import { clsx } from '../../lib/format'
import type { Tone } from '../../lib/hues'
import { SKILL_LIBRARY, type LibrarySkill } from '../../data/skillLibrary'
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
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="space-y-9">
      <TabHeader
        eyebrow="Governed learning"
        title="Skills"
        sub="Every thumbs-up distills a reusable, cited recipe. Three approvals promote it to trusted — one learning loop across every asset class."
        right={
          list.length > 0 ? (
            <>
              <Chip>{list.length} learned</Chip>
              <Chip>{list.filter((s) => s.status === 'trusted').length} trusted</Chip>
            </>
          ) : undefined
        }
      />

      <LifecycleStrip hasTrusted={hasTrusted} />

      {/* Learned this session */}
      {list.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<Sparkles size={22} />}
            text="Nothing learned this session — run a case to its thumbs-up to write a candidate skill."
          />
        </div>
      ) : (
        <div>
          <SectionLabel>Learned this session</SectionLabel>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {list.map((skill, i) => (
              <SkillCard key={skill.id} skill={skill} index={i} onView={setOpenId} />
            ))}
          </div>
        </div>
      )}

      <FleetLibrary learnedIds={new Set(list.map((s) => s.id))} onView={setOpenId} />

      <SmartMatching />

      <SkillFileModal id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
      {children}
    </div>
  )
}

// ── Lifecycle strip — monochrome, restrained ────────────────────────────────
function LifecycleStrip({ hasTrusted }: { hasTrusted: boolean }) {
  const stages = [
    { label: 'Born', sub: 'candidate', lit: true },
    { label: 'Reused', sub: 'matched + approved', lit: true },
    { label: 'Promoted', sub: 'trusted', lit: hasTrusted },
    { label: 'Retired', sub: 'superseded', lit: false },
  ]
  return (
    <div className="panel flex flex-wrap items-center gap-2.5 p-4">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2.5">
          <div
            className={clsx(
              'flex flex-col rounded-xl border px-3.5 py-2 transition-all',
              s.lit ? 'border-ink-900/[0.10] bg-paper-50' : 'border-ink-900/[0.06] opacity-40',
            )}
          >
            <span className="text-[12.5px] font-semibold text-ink-900">{s.label}</span>
            <span className="text-[10.5px] text-ink-400">{s.sub}</span>
          </div>
          {i < stages.length - 1 && <ArrowRight size={14} className="shrink-0 text-ink-300" />}
        </div>
      ))}
    </div>
  )
}

// ── Skill card (live learned) — calm, editorial ─────────────────────────────
function SkillCard({ skill, index, onView }: { skill: Skill; index: number; onView: (id: string) => void }) {
  const tone = STATUS_TONE[skill.status]
  const hard: [string, string][] = (
    [
      ['equipment_class', skill.match_key.equipment_class],
      ['component', skill.match_key.component],
      ['failure_mode', skill.match_key.failure_mode],
      ['environment', skill.match_key.environment],
      ['spec', skill.match_key.spec],
      ['capacity_band', skill.match_key.capacity_band],
    ] as [string, string | undefined][]
  ).filter((kv): kv is [string, string] => Boolean(kv[1]))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-ink-900/[0.07] bg-white p-5 shadow-card-flat"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-[13px] font-semibold text-ink-900">{skill.id}</div>
        <Badge tone={tone}>{skill.status}</Badge>
      </div>

      {/* Promotion progress — monochrome */}
      <div className="mt-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wide text-ink-400">promotion</span>
          <span className="font-mono text-[11px] text-ink-500">approve_count {skill.approve_count}/3</span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={clsx(
                'h-1.5 flex-1 rounded-full transition-all',
                i < skill.approve_count ? 'bg-ink-800' : 'bg-ink-900/[0.08]',
              )}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 text-[13px] leading-relaxed text-ink-700">{skill.diagnosis}</div>

      {skill.recipe.length > 0 && (
        <div className="mt-4">
          <div className="text-[10.5px] uppercase tracking-wide text-ink-400">Recipe</div>
          <ol className="mt-2 space-y-1.5">
            {skill.recipe.map((step, i) => (
              <li
                key={i}
                className="flex gap-2.5 rounded-lg border border-ink-900/[0.06] bg-paper-50 px-2.5 py-1.5"
              >
                <span className="font-mono text-[11px] font-semibold text-ink-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[11.5px] leading-relaxed text-ink-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Fingerprint / match key — monochrome */}
      <div className="mt-4 rounded-xl border border-ink-900/[0.07] bg-paper-50 p-3">
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-ink-400">
          <Fingerprint size={12} /> fingerprint
          <span className="ml-auto rounded-sm bg-ink-900/[0.06] px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-ink-500">
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

      {(skill.source_cases.length > 0 || skill.citations.length > 0) && (
        <div className="mt-3.5 space-y-2.5">
          {skill.source_cases.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] uppercase tracking-wide text-ink-400">from</span>
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
                  <Quote size={11} className="text-ink-400" />
                  {cite}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {skillFileExists(skill.id) && (
        <button
          onClick={() => onView(skill.id)}
          className="group mt-4 flex w-full items-center gap-1.5 border-t border-ink-900/[0.06] pt-3 text-[11px] text-ink-400"
        >
          <span className="font-medium text-ink-600 transition-colors group-hover:text-brand-600">View skill file</span>
          <ArrowUpRight size={12} className="text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          <span className="ml-auto font-mono text-[10.5px]">skills/{skill.id}.md</span>
        </button>
      )}
    </motion.div>
  )
}

// ── Fleet skill library — horizontal breadth, monochrome + soft status ──────
const LIB_STATUS_TONE: Record<LibrarySkill['status'], Tone> = {
  candidate: 'warn',
  trusted: 'ok',
  retired: 'muted',
}

function FleetLibrary({ learnedIds, onView }: { learnedIds: Set<string>; onView: (id: string) => void }) {
  const items = SKILL_LIBRARY.filter((s) => !learnedIds.has(s.id))
  const domains = Array.from(new Set(SKILL_LIBRARY.map((s) => s.domain)))
  if (items.length === 0) return null
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <SectionLabel>Fleet skill library</SectionLabel>
        <span className="mb-4 font-mono text-[11px] text-ink-400">
          {SKILL_LIBRARY.length} recipes · {domains.length} domains
        </span>
      </div>
      <p className="-mt-2 mb-5 max-w-2xl text-[13.5px] leading-relaxed text-ink-500">
        One learning loop, every asset class. The same hard-gated recipe format spans solar, telecom,
        rotating plant, HVAC, rail, power and water — nothing here is wired to a single vertical.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((s, i) => (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => onView(s.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="group flex flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-5 text-left shadow-card-flat transition-all hover:-translate-y-0.5 hover:border-ink-900/[0.14] hover:shadow-card-light"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-ink-900/[0.10] bg-paper-50 px-2.5 py-0.5 text-[10px] font-medium text-ink-500">
                {s.domain}
              </span>
              <Badge tone={LIB_STATUS_TONE[s.status]}>{s.status}</Badge>
            </div>
            <div className="mt-3 font-mono text-[12.5px] font-semibold text-ink-900">{s.id}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip className="!gap-1">
                <span className="text-ink-400">class</span>
                <span className="font-mono text-ink-700">{s.equipment_class}</span>
              </Chip>
              <Chip className="!gap-1">
                <span className="text-ink-400">mode</span>
                <span className="font-mono text-ink-700">{s.failure_mode}</span>
              </Chip>
            </div>
            <div className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-ink-500">{s.diagnosis}</div>
            <div className="mt-4 flex items-center gap-1.5 border-t border-ink-900/[0.06] pt-3 text-[11px] text-ink-400">
              <span className="font-medium text-ink-600 transition-colors group-hover:text-brand-600">View skill file</span>
              <ArrowUpRight size={12} className="text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span className="ml-auto font-mono text-[10.5px]">skills/{s.id}.md</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Smart matching explainer — monochrome ───────────────────────────────────
function SmartMatching() {
  const hard = [
    { k: 'equipment_class', d: 'the kind of asset — never cross-applies' },
    { k: 'component', d: 'the failing part within it' },
    { k: 'capacity_band', d: 'sizing tier of the unit' },
    { k: 'failure_mode', d: 'the observed mode of failure' },
  ]
  const soft = [
    { k: 'environment', d: 'operating context — colours the prior' },
    { k: 'vendor', d: 'who supplied it — a hint, not a gate' },
  ]
  return (
    <div className="panel p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-900/[0.08] bg-paper-50 text-ink-600">
          <Fingerprint size={16} />
        </span>
        <div>
          <div className="text-sm font-semibold text-ink-900">Smart matching</div>
          <div className="text-[12.5px] text-ink-500">
            A skill only fires when its hard fingerprint matches exactly. Soft attributes can only move
            confidence — never open the gate.
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ink-900/[0.10] bg-paper-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-700">
              Hard attributes
            </span>
            <span className="rounded-full border border-ink-900/[0.12] bg-white px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-600">
              hard gate
            </span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
            Must match exactly. If any differs, the skill does not apply at all.
          </p>
          <div className="mt-3 space-y-2">
            {hard.map((h) => (
              <div
                key={h.k}
                className="flex items-baseline gap-2 rounded-lg border border-ink-900/[0.07] bg-white px-2.5 py-1.5"
              >
                <span className="font-mono text-[11.5px] font-semibold text-ink-700">{h.k}</span>
                <span className="text-[11px] text-ink-400">{h.d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-ink-900/[0.07] bg-paper-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Soft attributes
            </span>
            <span className="rounded-full border border-ink-900/[0.08] bg-white px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-400">
              confidence only
            </span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
            Lowers confidence only — a soft mismatch never blocks a match.
          </p>
          <div className="mt-3 space-y-2">
            {soft.map((s) => (
              <div
                key={s.k}
                className="flex items-baseline gap-2 rounded-lg border border-ink-900/[0.06] bg-white px-2.5 py-1.5"
              >
                <span className="font-mono text-[11.5px] font-semibold text-ink-700">{s.k}</span>
                <span className="text-[11px] text-ink-400">{s.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
