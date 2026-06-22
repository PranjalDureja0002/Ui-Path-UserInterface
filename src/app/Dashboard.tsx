import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  Activity,
  GitBranch,
  Images,
  LayoutGrid,
  Phone,
  PhoneCall,
  Sparkles,
  Users,
  FileText,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { ReplayControls } from '../components/ReplayControls'
import { useReplayClock } from '../store/useReplayClock'
import { useLiveFeed } from '../store/liveFeed'
import { useStore } from '../store/store'
import { FEED_MODE } from '../config'
import { clsx } from '../lib/format'

const TABS = [
  { to: 'cases', label: 'Cases', icon: LayoutGrid },
  { to: 'console', label: 'Console', icon: Activity },
  { to: 'media', label: 'MediaBoard', icon: Images },
  { to: 'crew', label: 'Crew', icon: Users },
  { to: 'calls', label: 'Calls', icon: Phone },
  { to: 'skills', label: 'Skills', icon: Sparkles },
  { to: 'fleet', label: 'Fleet', icon: GitBranch },
  { to: 'audit', label: 'Audit', icon: FileText },
]

const STATUS_TONE: Record<string, string> = {
  open: 'text-info',
  parked: 'text-warn',
  resolved: 'text-ok',
  closed: 'text-ok',
}

export function Dashboard() {
  useReplayClock() // demo: drives the scripted replay
  useLiveFeed() // live: streams real CaseEvents over WebSocket (no-op in demo)
  const activeCase = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))

  return (
    <div className="relative flex min-h-screen flex-col bg-page">
      {/* Clean enterprise canvas — a cool, near-neutral wash with the faintest brand tint */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-paper-50 via-page to-page" />
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -right-[14%] -top-[10%] h-[420px] w-[620px] rounded-full bg-brand-500/[0.05] blur-[160px]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ink-900/[0.07] bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
          <Link to="/" className="shrink-0">
            <Logo subtitle="Control Room" size={30} />
          </Link>

          {activeCase && (
            <div className="flex items-center gap-2 rounded-full border border-ink-900/[0.08] bg-white px-3 py-1.5 shadow-card-soft">
              <PhoneCall size={13} className="text-ink-400" />
              <span className="font-mono text-[11px] text-ink-700">{activeCase.case_id}</span>
              <span className="text-ink-300">·</span>
              <span className="font-mono text-[11px] text-ink-500">{activeCase.site_id}</span>
              <span
                className={clsx(
                  'ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  STATUS_TONE[activeCase.status] ?? 'text-ink-500',
                )}
              >
                {activeCase.status}
              </span>
            </div>
          )}

          <div className="ml-auto min-w-[280px] flex-1">
            {FEED_MODE === 'live' ? <LiveBadge /> : <ReplayControls />}
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto flex max-w-[1500px] gap-0.5 overflow-x-auto px-4">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                clsx(
                  'group relative flex items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors',
                  isActive ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon size={15} />
                  {t.label}
                  <span
                    className={clsx(
                      'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all',
                      isActive ? 'bg-brand-sheen opacity-100' : 'opacity-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-5 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

function LiveBadge() {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/[0.07] px-3 py-1.5 text-[12px] font-semibold text-ok">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
        </span>
        LIVE
      </span>
      <span className="font-mono text-[11px] text-ink-400">streaming from UiPath · Maestro</span>
    </div>
  )
}
