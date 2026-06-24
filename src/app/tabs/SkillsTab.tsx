import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Award, Fingerprint, GitBranch, Layers, Quote, Sparkles } from 'lucide-react'
import { useStore } from '../../store/store'
import { Badge, Chip, Empty } from '../../components/ui'
import { SkillFileModal, skillFileExists } from '../../components/SkillFileModal'
import { clsx } from '../../lib/format'
import { TONE_HEX, type Tone } from '../../lib/hues'
import { SKILL_LIBRARY, type LibrarySkill } from '../../data/skillLibrary'
import type { Skill, SkillStatus } from '../../types'
import skillImg from '../../assets/skill.png'

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
      <SkillsHero
        learned={list.length}
        trusted={list.filter((s) => s.status === 'trusted').length}
        domains={new Set(SKILL_LIBRARY.map((s) => s.domain)).size}
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

// ── Hero — the semantic-layer banner (skill.png) ────────────────────────────
function SkillsHero({ learned, trusted, domains }: { learned: number; trusted: number; domains: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-900/[0.08] bg-[#0b1411] shadow-card-light">
      <div className="relative grid grid-cols-1 items-stretch lg:grid-cols-[1fr_440px]">
        <div className="p-7 sm:p-9">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-emerald-300">
            <Sparkles size={12} /> Semantic layer · governed learning
          </div>
          <h1 className="mt-4 font-display text-[40px] font-bold leading-[1.02] tracking-tight text-white sm:text-[52px]">
            Agent <span className="text-emerald-400">Skills</span>
          </h1>
          <p className="mt-3.5 max-w-lg text-[14px] leading-relaxed text-white/60">
            Every thumbs-up distills a reusable, hard-gated, cited recipe — a{' '}
            <span className="font-mono text-white/85">SKILL.md</span> card. Three approvals promote it to
            trusted. One learning loop across every asset class.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <HeroStat icon={<Sparkles size={15} />} n={learned} l="learned this session" />
            <HeroStat icon={<Award size={15} />} n={trusted} l="trusted" emerald />
            <HeroStat icon={<Layers size={15} />} n={domains} l="asset domains" />
          </div>
        </div>
        <div className="relative hidden lg:block">
          <img src={skillImg} alt="Agent Skills — skills.md" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1411] via-[#0b1411]/35 to-transparent" />
        </div>
      </div>
    </div>
  )
}

function HeroStat({ icon, n, l, emerald }: { icon: ReactNode; n: number; l: string; emerald?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
      <span
        className={clsx(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          emerald ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.06] text-white/70',
        )}
      >
        {icon}
      </span>
      <div>
        <div className="font-display text-lg font-bold leading-none text-white">{n}</div>
        <div className="mt-0.5 text-[10.5px] text-white/45">{l}</div>
      </div>
    </div>
  )
}

// ── Lifecycle strip — monochrome, restrained ────────────────────────────────
function LifecycleStrip({ hasTrusted }: { hasTrusted: boolean }) {
  const stages = [
    { label: 'Born', sub: 'candidate', lit: true, icon: <Sparkles size={14} />, hex: '#c77b08' },
    { label: 'Reused', sub: 'matched + approved', lit: true, icon: <GitBranch size={14} />, hex: '#1d84d6' },
    { label: 'Promoted', sub: 'trusted', lit: hasTrusted, icon: <Award size={14} />, hex: '#1aa251' },
    { label: 'Retired', sub: 'superseded', lit: false, icon: <ArrowRight size={14} />, hex: '#697079' },
  ]
  return (
    <div className="panel flex flex-wrap items-center gap-2.5 p-4">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2.5">
          <div
            className={clsx(
              'flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all',
              s.lit ? 'border-ink-900/[0.10] bg-white' : 'border-ink-900/[0.06] opacity-40',
            )}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: `${s.hex}16`, color: s.hex }}
            >
              {s.icon}
            </span>
            <div className="flex flex-col">
              <span className="text-[12.5px] font-semibold text-ink-900">{s.label}</span>
              <span className="text-[10.5px] text-ink-400">{s.sub}</span>
            </div>
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
  const hex = TONE_HEX[tone]
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
      className="relative overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white p-5 pl-6 shadow-card-flat"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: hex }} />
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
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{ background: i < skill.approve_count ? hex : 'rgba(20,23,28,0.08)' }}
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
              <span className="rounded-md border border-ink-900/[0.10] bg-paper-50 px-2.5 py-0.5 text-[10px] font-medium text-ink-500">
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
            <span className="rounded border border-ink-900/[0.12] bg-white px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-600">
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
            <span className="rounded border border-ink-900/[0.08] bg-white px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-400">
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
