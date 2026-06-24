import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Bot, Check, ShieldAlert, X } from 'lucide-react'
import { useStore } from '../../store/store'
import { Badge, Chip, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import robosUrl from '../../assets/robos.png'
import { CREW_ICON as ICON } from '../../data/crewIcons'
import {
  ALWAYS_ON,
  SPECIALISTS,
  VISION,
  invocationFor,
  type CrewAgent,
  type Invocation,
} from '../../data/crew'

export function CrewTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  const scenario = c?.scenario ?? 'C'
  const { invoked, skipped } = invocationFor(scenario)
  const invokedIds = new Set(invoked.map((i) => i.id))
  const byId = Object.fromEntries(SPECIALISTS.map((s) => [s.id, s]))

  return (
    <div className="space-y-9">
      <TabHeader
        eyebrow="The dynamic crew"
        title="One orchestrator, a crew per case"
        sub="Vision perceives; the always-on brain diagnoses every case. The Supervisor then assembles only the specialists the findings call for — and justifies the ones it holds back."
        right={
          <>
            <Chip>{SPECIALISTS.length} specialists</Chip>
            <Chip>{invoked.length} invoked</Chip>
          </>
        }
      />

      <Orchestration invokedIds={invokedIds} />

      <AlwaysOnCard />

      {/* Invoked */}
      <div>
        <SectionLabel>
          Invoked for this case
          <span className="ml-2 font-mono text-ink-300">{invoked.length}</span>
        </SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {invoked.map((inv, i) => {
            const agent = byId[inv.id]
            if (!agent) return null
            return <SpecialistCard key={inv.id} agent={agent} inv={inv} invoked index={i} />
          })}
        </div>
      </div>

      {/* Held back */}
      {skipped.length > 0 && (
        <div>
          <SectionLabel>
            Held back — and why
            <span className="ml-2 font-mono text-ink-300">{skipped.length}</span>
          </SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {skipped.map((inv, i) => {
              const agent = byId[inv.id]
              if (!agent) return null
              return <SpecialistCard key={inv.id} agent={agent} inv={inv} invoked={false} index={i} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
      {children}
    </div>
  )
}

// ── The orchestration stage — the puppeteer robot conducting the crew ────────
const BRAND = '#2f6dff'
const AMBER = '#c77b08'
// the robot "hands" the strings hang from (0–100 canvas)
const HAND_L = { x: 43.5, y: 33 }
const HAND_R = { x: 56.5, y: 33 }
const ROW_Y = 84

function Orchestration({ invokedIds }: { invokedIds: Set<string> }) {
  const cols = SPECIALISTS.map((_, i) => 7 + i * (86 / (SPECIALISTS.length - 1)))

  return (
    <div className="panel overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-ink-900/[0.045] text-ink-500 ring-1 ring-inset ring-ink-900/[0.04]">
            <Bot size={15} />
          </span>
          <h3 className="text-[14.5px] font-semibold tracking-tight text-ink-900">
            Supervisor orchestration
          </h3>
        </div>
        <Chip>assembled per case</Chip>
      </div>

      <div className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-ink-900/[0.06] bg-gradient-to-b from-white via-paper-50 to-paper-100 sm:h-[500px]">
        {/* backdrop — dot grid, brand glow, a soft stage floor */}
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-[0.45]" />
        <div className="pointer-events-none absolute left-1/2 top-[6%] h-[46%] w-[44%] -translate-x-1/2 rounded-full bg-brand-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-brand-500/[0.05] to-transparent" />

        {/* control strings (SVG) — drawn beneath the nodes */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {SPECIALISTS.map((s, i) => {
            const on = invokedIds.has(s.id)
            const hand = i < SPECIALISTS.length / 2 ? HAND_L : HAND_R
            const accent = on ? (s.safety ? AMBER : BRAND) : '#9aa1aa'
            const x2 = cols[i]
            const y2 = ROW_Y - 6
            return (
              <g key={s.id}>
                {on && (
                  // soft glow halo under live strings
                  <line x1={hand.x} y1={hand.y} x2={x2} y2={y2} stroke={accent} strokeOpacity={0.14}
                        strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                )}
                <line x1={hand.x} y1={hand.y} x2={x2} y2={y2} stroke={accent}
                      strokeOpacity={on ? 0.5 : 0.16} strokeWidth={on ? 1 : 0.7}
                      strokeLinecap="round" strokeDasharray={on ? undefined : '1.4 1.8'}
                      vectorEffect="non-scaling-stroke" />
                {on && (
                  <line x1={hand.x} y1={hand.y} x2={x2} y2={y2} stroke={accent} strokeOpacity={0.95}
                        strokeWidth={1.4} strokeLinecap="round" strokeDasharray="0.1 5"
                        vectorEffect="non-scaling-stroke">
                    <animate attributeName="stroke-dashoffset" from="0" to="-30"
                             dur={`${1.3 + (i % 4) * 0.22}s`} repeatCount="indefinite" />
                  </line>
                )}
              </g>
            )
          })}
        </svg>

        {/* the puppeteer robot — the Supervisor */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: [0, -7, 0] }}
          transition={{ opacity: { duration: 0.6 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
          className="pointer-events-none absolute left-[40%] top-[1%] z-20 -translate-x-1/2"
        >
          {/* white halo blends the image's white background into the stage */}
          <div className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 blur-2xl" />
          <img
            src={robosUrl}
            alt="Supervisor orchestrating the crew"
            className="relative w-[clamp(230px,32vw,310px)]"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 56%, transparent 80%)',
              maskImage: 'linear-gradient(to bottom, #000 0%, #000 56%, transparent 80%)',
            }}
          />
          <div className="absolute -bottom-1 left-1/2 h-3 w-40 -translate-x-1/2 rounded-[100%] bg-ink-900/10 blur-md" />
        </motion.div>

        {/* Supervisor label */}
        <div className="absolute left-1/2 top-[30%] z-20 -translate-x-1/2 rounded-md border border-ink-900/[0.10] bg-white/95 px-3 py-1 text-[10px] font-semibold text-ink-800 shadow-sm backdrop-blur-sm">
          Supervisor · orchestrator
        </div>

        {/* always-on core: Vision + Brain flanking */}
        <CoreNode agent={VISION} x={12} y={20} />
        <CoreNode agent={ALWAYS_ON} x={88} y={20} brain />

        {/* specialist crew */}
        {SPECIALISTS.map((s, i) => (
          <SpecNode key={s.id} agent={s} x={cols[i]} y={ROW_Y} invoked={invokedIds.has(s.id)} index={i} />
        ))}
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-900/[0.07] pt-4 text-[11px] text-ink-500">
        <LegendDot color={BRAND} label="invoked" />
        <LegendDot color={AMBER} label="invoked · can block (safety)" />
        <LegendDot color="#9aa1aa" label="held back" dim />
        <span className="ml-auto text-[10.5px] text-ink-300">
          the brain runs on every case · specialists are selected
        </span>
      </div>
    </div>
  )
}

function CoreNode({ agent, x, y, brain }: { agent: CrewAgent; x: number; y: number; brain?: boolean }) {
  const Icon = ICON[agent.id] ?? Bot
  return (
    <div
      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="relative flex items-center justify-center">
        <span
          className="absolute -inset-1.5 rounded-2xl"
          style={{ boxShadow: brain ? `0 0 0 1px ${BRAND}22` : '0 0 0 1px rgba(20,23,28,0.06)' }}
        />
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-white"
          style={{
            borderColor: brain ? `${BRAND}55` : '#14171c1f',
            color: brain ? BRAND : '#383f48',
            boxShadow: brain
              ? `0 0 24px -8px ${BRAND}, 0 1px 2px rgba(20,23,28,0.06)`
              : '0 6px 18px -10px rgba(20,23,28,0.4)',
          }}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </span>
      <div className="mt-2 whitespace-nowrap rounded-md border border-ink-900/[0.08] bg-white/95 px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-700 shadow-sm">
        {agent.short}
      </div>
      {brain && (
        <div className="mt-1 rounded bg-brand-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-brand-600">
          always on
        </div>
      )}
    </div>
  )
}

function SpecNode({ agent, x, y, invoked, index }: { agent: CrewAgent; x: number; y: number; invoked: boolean; index: number }) {
  const Icon = ICON[agent.id] ?? Bot
  const accent = invoked ? (agent.safety ? AMBER : BRAND) : '#9aa1aa'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: invoked ? 1 : 0.55, y: 0 }}
      transition={{ delay: 0.2 + index * 0.05, type: 'spring', stiffness: 200, damping: 18 }}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="relative flex items-center justify-center">
        {invoked && (
          <>
            <span className="absolute h-full w-full animate-ping rounded-2xl opacity-40" style={{ background: `${accent}30` }} />
            <span className="absolute -inset-1.5 rounded-2xl" style={{ boxShadow: `0 0 0 1px ${accent}28` }} />
          </>
        )}
        <div
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border"
          style={{
            background: invoked ? `linear-gradient(180deg,#ffffff,${accent}10)` : '#ffffff',
            borderColor: invoked ? `${accent}88` : '#dde0e4',
            color: invoked ? accent : '#c2c7ce',
            boxShadow: invoked ? `0 0 20px -5px ${accent}, 0 1px 2px rgba(20,23,28,0.05)` : '0 1px 2px rgba(20,23,28,0.04)',
          }}
        >
          <Icon size={17} strokeWidth={2} />
        </div>
      </span>
      <div className="mt-2 whitespace-nowrap text-[9px] font-semibold" style={{ color: invoked ? '#383f48' : '#c2c7ce' }}>
        {agent.short}
      </div>
    </motion.div>
  )
}

function LegendDot({ color, label, dim }: { color: string; label: string; dim?: boolean }) {
  return (
    <div className={clsx('flex items-center gap-2', dim && 'text-ink-400')}>
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: dim ? undefined : `0 0 8px ${color}` }} />
      {label}
    </div>
  )
}

// ── Always-on brain — the constant on every case ────────────────────────────
function AlwaysOnCard() {
  const Icon = ICON[ALWAYS_ON.id]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-400/25 bg-white p-6 shadow-card-soft">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/[0.06] blur-3xl" />
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-500/[0.08] text-brand-600">
          <Icon size={22} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-900">
              {ALWAYS_ON.name}
            </h3>
            <Badge tone="info">always on · every case</Badge>
            <Chip className="!text-[10px]">{ALWAYS_ON.kind}</Chip>
          </div>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-600">{ALWAYS_ON.tagline}</p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
            <span className="uppercase tracking-wide">reads</span>
            <span className="font-mono text-ink-600">{ALWAYS_ON.reads}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Specialist card (invoked / held-back) ───────────────────────────────────
function SpecialistCard({ agent, inv, invoked, index }: { agent: CrewAgent; inv: Invocation; invoked: boolean; index: number }) {
  const Icon = ICON[agent.id] ?? Bot
  const accent = agent.safety ? AMBER : BRAND
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={clsx(
        'flex flex-col rounded-2xl border p-4 shadow-card-flat transition-colors',
        invoked ? 'border-ink-900/[0.08] bg-white' : 'border-ink-900/[0.06] bg-paper-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl border"
            style={
              invoked
                ? { borderColor: `${accent}44`, background: `${accent}12`, color: accent }
                : { borderColor: '#e2e4e7', background: '#f3f4f2', color: '#bdc2c9' }
            }
          >
            <Icon size={16} strokeWidth={2} />
          </span>
          <div>
            <div className={clsx('text-[13px] font-semibold', invoked ? 'text-ink-900' : 'text-ink-400')}>
              {agent.name}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wide text-ink-400">{agent.kind}</div>
          </div>
        </div>
        {invoked ? (
          agent.safety ? (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-semibold" style={{ background: `${AMBER}16`, color: AMBER, border: `1px solid ${AMBER}33` }}>
              <ShieldAlert size={10} /> can block
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-semibold" style={{ background: `${BRAND}14`, color: BRAND, border: `1px solid ${BRAND}30` }}>
              <Check size={10} /> invoked
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-ink-900/[0.08] bg-white px-2 py-0.5 text-[9.5px] font-medium text-ink-400">
            <X size={10} /> held back
          </span>
        )}
      </div>

      <p className={clsx('mt-3 text-[12px] leading-relaxed', invoked ? 'text-ink-600' : 'text-ink-400')}>
        {agent.tagline}
      </p>

      {inv.why && (
        <div
          className="mt-3 rounded-xl border px-3 py-2.5 text-[11.5px] leading-relaxed"
          style={
            invoked
              ? { borderColor: `${accent}26`, background: `${accent}0a`, color: '#4d5560' }
              : { borderColor: 'rgba(20,23,28,0.06)', background: 'rgba(20,23,28,0.015)', color: '#697079' }
          }
        >
          <span className={clsx('font-semibold', invoked ? '' : 'text-ink-500')} style={invoked ? { color: accent } : undefined}>
            {invoked ? 'Why invoked · ' : 'Why not · '}
          </span>
          {inv.why}
        </div>
      )}

      {agent.horizontal && (
        <div className="mt-auto pt-3 text-[10.5px] text-ink-400">
          <span className="uppercase tracking-wide">horizontal</span>{' '}
          <span className="font-mono">{agent.horizontal}</span>
        </div>
      )}
    </motion.div>
  )
}
