import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Boxes,
  Brain,
  Database,
  Fingerprint,
  FileSearch,
  MessageCircle,
  Network,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Workflow,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { Chip } from '../components/ui'
import { STAGES } from '../types'
import { STORES } from '../data/entities'
import { HUE_HEX, HUE_SOFT } from '../lib/hues'
import { clsx } from '../lib/format'
import agenticArchitecture from '../assets/agentic-architecture.png'
import themeBlobs from '../assets/theme-blobs.png'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Home() {
  return (
    <div className="min-h-screen bg-page text-ink-700">
      <LandingNav />
      <Hero />
      <TechStrip />
      <ConductorSection />
      <HowItWorks />
      <StoresSection />
      <MatchingLearning />
      <ImpactSection />
      <CTASection />
      <Footer />
    </div>
  )
}

// ── Nav ─────────────────────────────────────────────────────────────────────
function LandingNav() {
  const links = [
    { id: 'idea', label: 'The idea' },
    { id: 'how', label: 'How it works' },
    { id: 'stores', label: 'Stores' },
    { id: 'learning', label: 'Learning' },
  ]
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* soft scrim so the nav merges with the page at the top, fading to transparent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[120%] bg-gradient-to-b from-page via-page/85 to-transparent" />
      <div className="mx-auto flex max-w-[1340px] items-center justify-between gap-4 px-6 py-5">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <Link to="/app" className="btn btn-ink !px-4 !py-2 !text-[13px]">
          Launch Control Room
          <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  )
}

// ── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden pb-24 pt-32">
      {/* clean, even background with a whisper of cool colour */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-paper-100 via-page to-paper-100" />
      <div className="pointer-events-none absolute -right-[6%] -top-[14%] -z-10 h-[640px] w-[780px] rounded-full bg-pastel-sky/25 blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-[18%] -left-[6%] -z-10 h-[560px] w-[680px] rounded-full bg-pastel-mint/[0.16] blur-[150px]" />

      {/* the blob — large, free, bleeding off the right edge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-y-0 right-[-1%] hidden w-[56%] items-center lg:flex"
      >
        <motion.img
          src={themeBlobs}
          alt="Multimodal WhatsApp intake — text, image, audio and video flowing into FOREMAN"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1, y: [0, -16, 0] }}
          transition={{
            scale: { duration: 1.2, ease: 'easeOut' },
            y: { repeat: Infinity, duration: 11, ease: 'easeInOut' },
          }}
          className="w-full max-w-none drop-shadow-[0_40px_90px_rgba(20,23,28,0.10)] [mask-image:linear-gradient(to_right,transparent,#000_24%,#000_100%)]"
        />
      </motion.div>

      <div className="relative z-10 mx-auto w-full max-w-[1340px] px-6">
        <div className="max-w-[600px]">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-[clamp(2.3rem,5.2vw,4.2rem)] font-medium leading-[1.04] tracking-[-0.02em] text-ink-900"
          >
            From a WhatsApp message to a{' '}
            <span className="text-sheen">defensible resolution.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-7 max-w-lg text-[16.5px] leading-relaxed text-ink-500"
          >
            The autonomous field-operations colleague for industrial fleets — solar, telecom,
            manufacturing, HVAC and beyond. It perceives the fault, reasons to a cause, predicts the
            blast-radius, calls the manager, files the real tickets, and learns from every human decision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link to="/app" className="btn btn-ink">
              <Play size={16} /> Launch the control room
            </Link>
            <button onClick={() => scrollTo('how')} className="btn btn-light">
              See how it works
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 flex flex-wrap gap-x-10 gap-y-4"
          >
            {[
              ['6', 'specialist agents'],
              ['7', 'durable stages'],
              ['2', 'human gates'],
              ['100%', 'cited reasoning'],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-[26px] font-bold tracking-tightest text-ink-900">{n}</div>
                <div className="text-[11px] text-ink-400">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ── Tech strip ──────────────────────────────────────────────────────────────
function TechStrip() {
  const tech = ['UiPath Maestro', 'LangGraph', 'Gemini 2.5', 'Twilio Voice', 'Neo4j AuraDB', 'ServiceNow', 'Context Grounding', 'Data Fabric']
  return (
    <div className="border-y border-ink-900/[0.06] bg-white/60 py-5">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Built on</span>
          {tech.map((t) => (
            <span key={t} className="font-display text-sm font-bold text-ink-600/70">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Section heading helper ──────────────────────────────────────────────────
function SectionHead({
  eyebrow,
  title,
  sub,
  center,
}: {
  eyebrow: string
  title: ReactNode
  sub?: string
  center?: boolean
}) {
  return (
    <div className={clsx('max-w-2xl', center && 'mx-auto text-center')}>
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-brand-600">
        {eyebrow}
      </div>
      <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.06] tracking-[-0.02em] text-ink-900 sm:text-5xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[16px] leading-relaxed text-ink-500">{sub}</p>}
    </div>
  )
}

// ── The one idea — 3 worker cards ───────────────────────────────────────────
function ConductorSection() {
  const workers = [
    {
      hue: 'lilac' as const,
      icon: Brain,
      tag: 'Agents',
      title: 'Thinking',
      desc: 'Coded LangGraph brains and low-code specialists. They perceive, diagnose, and decide — then merge into one cited recommendation.',
      points: ['Supervisor + 5 specialists', 'Run in parallel', 'Strict-JSON outputs'],
    },
    {
      hue: 'amber' as const,
      icon: ShieldCheck,
      tag: 'Action Center',
      title: 'Human gate',
      desc: 'Two governed checkpoints. The case parks, a person answers in WhatsApp or Action Center, and it resumes — nothing irreversible without a yes.',
      points: ['Confirm the diagnosis', 'Approve the call', 'Durable parking'],
    },
    {
      hue: 'mint' as const,
      icon: Workflow,
      tag: 'BPMN processes',
      title: 'Deterministic actions',
      desc: 'Idempotent writes to real systems — tickets, work orders, warranty claims — each one guarded, retried, and reversible on failure.',
      points: ['Guarded by case data', 'Idempotency keys', 'Compensation on error'],
    },
  ]
  return (
    <section id="idea" className="py-24 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <SectionHead
          eyebrow="The one idea"
          title="A conductor, not a worker."
          sub="The UiPath Maestro Case holds the shared case data and, at every stage, decides who to hand the work to. There are only three kinds of worker it ever calls."
        />
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {workers.map((w, i) => (
            <motion.div
              key={w.tag}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={clsx('pastel-card flex flex-col p-7', HUE_SOFT[w.hue])}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-ink-800 shadow-sm">
                  <w.icon size={20} />
                </div>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-700">
                  {w.tag}
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold tracking-tightest text-ink-900">
                {w.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{w.desc}</p>
              <div className="mt-5 space-y-2 rounded-2xl bg-white/65 p-4">
                {w.points.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-[12.5px] font-medium text-ink-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-900/40" />
                    {p}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works — pastel gradient, 7 stages + image ────────────────────────
function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden py-24 sm:py-28">
      <div className="absolute inset-0 bg-mesh-pastel-soft opacity-80" />
      <div className="relative mx-auto max-w-[1200px] px-6">
        <SectionHead
          center
          eyebrow="The end-to-end run"
          title="Seven stages, one shared case."
          sub="Each stage calls a worker, writes to the shared case data, and an exit condition picks the next. Because the engine is durable, a stage can park and wait — costing nothing — then wake when the event arrives."
        />

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl border border-ink-900/[0.07] bg-white/80 p-4 text-center backdrop-blur-sm"
            >
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 font-display text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="mt-2.5 text-[13px] font-bold text-ink-900">{s.label}</div>
              <div className="mt-0.5 text-[10.5px] leading-tight text-ink-500">{s.blurb}</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          {/* left — text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-brand-600">
              The whole machine
            </div>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-ink-900 sm:text-[2.35rem]">
              Every worker, store, and stage — in one view.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
              A WhatsApp message opens a case. The Maestro conductor hands each stage to an agent, a
              human gate, or a deterministic write — while the crew reads the four stores and feeds
              them back on close. Smart matching and the learning payoff make every next case faster,
              and cited.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip chip-light">3 workers</span>
              <span className="chip chip-light">4 stores</span>
              <span className="chip chip-light">candidate → trusted</span>
            </div>
          </motion.div>

          {/* right — architecture image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="overflow-hidden rounded-3xl border border-ink-900/[0.08] bg-white p-2.5 shadow-card-light"
          >
            <img
              src={agenticArchitecture}
              alt="Agentic Foreman architecture — workers, the four stores, smart matching and the learning payoff"
              className="w-full rounded-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ── Stores ──────────────────────────────────────────────────────────────────
function StoresSection() {
  const icons: Record<string, typeof Database> = {
    data_fabric: Database,
    context_grounding: FileSearch,
    agent_memory: Boxes,
    neo4j: Network,
  }
  return (
    <section id="stores" className="py-24 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <SectionHead
          eyebrow="The four stores"
          title="What makes it smart."
          sub="When an agent thinks, it reads from four stores. Closing a case feeds them — so the next case is smarter."
        />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STORES.map((store, i) => {
            const hex = HUE_HEX[store.hue]
            const Icon = icons[store.id] ?? Database
            return (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative overflow-hidden rounded-3xl border border-ink-900/[0.07] bg-white p-6 shadow-card-soft"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-60"
                  style={{ background: hex }}
                />
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: `${hex}26`, color: shade(hex), border: `1px solid ${hex}66` }}
                >
                  <Icon size={22} />
                </div>
                <h3 className="relative mt-4 font-display text-lg font-bold tracking-tightest text-ink-900">
                  {store.name}
                </h3>
                <p className="relative mt-2 text-[13px] leading-relaxed text-ink-500">{store.holds}</p>
                <div className="relative mt-4">
                  <span className="chip chip-light" style={{ color: shade(hex) }}>
                    {store.agentsDo}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// darken a pastel hex for legible text/icon on white
function shade(hex: string): string {
  const m = hex.replace('#', '')
  const r = Math.round(parseInt(m.slice(0, 2), 16) * 0.58)
  const g = Math.round(parseInt(m.slice(2, 4), 16) * 0.58)
  const b = Math.round(parseInt(m.slice(4, 6), 16) * 0.58)
  return `rgb(${r}, ${g}, ${b})`
}

// ── Smart matching + learning payoff ────────────────────────────────────────
function MatchingLearning() {
  const hard = ['equipment_class', 'component', 'capacity_band', 'failure_mode']
  const soft = ['environment', 'vendor']
  return (
    <section id="learning" className="bg-white/60 py-24 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <SectionHead
          eyebrow="Careful enough for the real world"
          title="It adapts — it never blindly copies."
          sub="An auxiliary fault on a 1500-tonne machine must not be treated like a screw issue on a 100-tonne one. FOREMAN matches on a structured fingerprint, then learns a cited recipe from every approval."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Fingerprint */}
          <div className="panel p-7">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-600">
                <Fingerprint size={20} />
              </div>
              <h3 className="font-display text-xl font-bold tracking-tightest text-ink-900">Smart matching</h3>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
              Find candidates by meaning in Context Grounding, then a hard gate throws out anything whose
              hard attributes differ. Continuous values match by band, set per equipment type.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-danger/25 bg-danger/[0.06] p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-danger">Hard · must match</div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {hard.map((h) => (
                    <span key={h} className="chip chip-light font-mono">{h}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-warn/25 bg-warn/[0.06] p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-warn">Soft · confidence only</div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {soft.map((s) => (
                    <span key={s} className="chip chip-light font-mono">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Learning payoff */}
          <div className="panel p-7">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ok/12 text-ok">
                <Sparkles size={20} />
              </div>
              <h3 className="font-display text-xl font-bold tracking-tightest text-ink-900">The learning payoff</h3>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-ink-900/[0.07] bg-paper-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="chip chip-light">First case · from scratch</span>
                  <ThumbsUp size={14} className="text-ok" />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
                  Nothing learned yet → the crew reasons from scratch, solves it, and on the thumbs-up writes a{' '}
                  <span className="font-semibold text-ink-900">candidate</span> skill card.
                </p>
              </div>
              <div className="flex justify-center text-ink-300">
                <ArrowRight size={18} className="rotate-90" />
              </div>
              <div className="rounded-2xl border border-ok/25 bg-ok/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <span className="chip chip-light text-ok" style={{ borderColor: '#1aa25155' }}>Similar case · cited</span>
                  <Sparkles size={14} className="text-ok" />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
                  A similar asset matches the gate → FOREMAN proposes instantly, cites the first case, and on approval the
                  skill is promoted to <span className="font-semibold text-ok">trusted</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Impact stats ────────────────────────────────────────────────────────────
function ImpactSection() {
  const stats = [
    { n: '₹48k', l: 'exposure / hr avoided', tone: '#c77b08' },
    { n: '6 units', l: 'flagged before they failed', tone: '#e23b3b' },
    { n: '1 fault', l: 'into a fleet-wide decision', tone: '#1d84d6' },
    { n: '0 → 6', l: 'a flat query → the graph', tone: '#1aa251' },
  ]
  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div className="absolute inset-0 bg-mesh-pastel opacity-55" />
      <div className="relative mx-auto max-w-[1200px] px-6">
        <SectionHead center eyebrow="Business impact" title="One message. One defensible decision." />
        <div className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="rounded-3xl border border-ink-900/[0.07] bg-white/85 p-7 text-center shadow-card-soft backdrop-blur-sm"
            >
              <div className="font-display text-4xl font-bold tracking-tightest" style={{ color: s.tone }}>
                {s.n}
              </div>
              <div className="mt-2 text-[12.5px] font-medium text-ink-500">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ─────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-0 bg-blob-cool opacity-40" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <div className="mx-auto mb-6 flex w-fit items-center gap-2">
          <Phone size={16} className="text-brand-600" />
          <MessageCircle size={16} className="text-[#1aa251]" />
          <Network size={16} className="text-violet" />
        </div>
        <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tightest text-ink-900 sm:text-5xl">
          Watch it run, live.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-500">
          Send a WhatsApp clip, watch the crew assemble, hear the call, and see a real ticket appear —
          then send a similar one and watch FOREMAN say “I’ve seen this before.”
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to="/app" className="btn btn-ink">
            <Play size={16} /> Launch the control room
          </Link>
          <Link to="/app/cases" className="btn btn-light">
            Open the case queue
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink-900/[0.06] py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Logo />
        <div className="text-[12px] text-ink-400">
          UiPath AgentHack 2026 · Track 1 · Maestro Case · built with Claude Code
        </div>
        <div className="flex gap-2">
          <Chip>Twilio</Chip>
          <Chip>Gemini</Chip>
          <Chip>Neo4j</Chip>
        </div>
      </div>
    </footer>
  )
}
