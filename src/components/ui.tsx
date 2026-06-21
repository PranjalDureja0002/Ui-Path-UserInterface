import type { ReactNode } from 'react'
import { clsx } from '../lib/format'
import { TONE_HEX, type Tone } from '../lib/hues'

// ── Pill chip (icon + label) ────────────────────────────────────────────────
export function Chip({
  children,
  icon,
  className,
  variant = 'dark',
}: {
  children: ReactNode
  icon?: ReactNode
  className?: string
  variant?: 'dark' | 'light'
}) {
  return (
    <span className={clsx('chip', variant === 'light' ? 'chip-light' : 'chip-dark', className)}>
      {icon && <span className="-ml-0.5 opacity-80">{icon}</span>}
      {children}
    </span>
  )
}

// ── Small uppercase mono section label ──────────────────────────────────────
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-ink-400',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── Elegant page/tab header — the home-page recipe (brand eyebrow + big title) ─
export function TabHeader({
  eyebrow,
  title,
  sub,
  right,
  className,
}: {
  eyebrow: string
  title: ReactNode
  sub?: string
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="max-w-2xl">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          {eyebrow}
        </div>
        <h1 className="mt-2.5 font-display text-[27px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink-900 sm:text-[33px]">
          {title}
        </h1>
        {sub && <p className="mt-2.5 max-w-xl text-[14.5px] leading-relaxed text-ink-500">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

// ── Status dot (with optional pulse) ────────────────────────────────────────
export function Dot({ tone = 'muted', pulse, size = 8 }: { tone?: Tone; pulse?: boolean; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {pulse && (
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-60"
          style={{ background: TONE_HEX[tone] }}
        />
      )}
      <span
        className="relative inline-block rounded-full"
        style={{ width: size, height: size, background: TONE_HEX[tone] }}
      />
    </span>
  )
}

// ── Badge ───────────────────────────────────────────────────────────────────
export function Badge({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  const hex = TONE_HEX[tone]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        className,
      )}
      style={{ background: `${hex}16`, color: hex, border: `1px solid ${hex}33` }}
    >
      {children}
    </span>
  )
}

// ── Metric / stat block ─────────────────────────────────────────────────────
export function Stat({
  value,
  label,
  sub,
  tone,
  className,
}: {
  value: ReactNode
  label: string
  sub?: string
  tone?: Tone
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col', className)}>
      <div
        className="font-display text-2xl font-bold tracking-tightest text-ink-900"
        style={tone ? { color: TONE_HEX[tone] } : undefined}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-ink-500">{label}</div>
      {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
    </div>
  )
}

// ── Enterprise KPI card (icon chip + big metric + label) ────────────────────
export function Kpi({
  icon,
  value,
  label,
  tone = 'muted',
  className,
}: {
  icon?: ReactNode
  value: ReactNode
  label: string
  tone?: Tone
  className?: string
}) {
  const hex = TONE_HEX[tone]
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-ink-900/[0.08] bg-white p-4 shadow-card-soft',
        className,
      )}
    >
      {icon && (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${hex}14`, color: hex, border: `1px solid ${hex}2e` }}
        >
          {icon}
        </span>
      )}
      <div
        className="mt-3 font-display text-[26px] font-bold leading-none tracking-tightest"
        style={{ color: hex }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[12px] font-medium text-ink-500">{label}</div>
    </div>
  )
}

// ── Panel header ────────────────────────────────────────────────────────────
export function PanelHeader({
  title,
  icon,
  right,
  className,
}: {
  title: ReactNode
  icon?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex items-center justify-between gap-3 px-5 py-3.5', className)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-ink-900/[0.045] text-ink-500 ring-1 ring-inset ring-ink-900/[0.04]">
            {icon}
          </span>
        )}
        <h3 className="text-[14.5px] font-semibold tracking-tight text-ink-900">{title}</h3>
      </div>
      {right}
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────
export function Empty({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-ink-300">{icon}</div>}
      <div className="text-sm text-ink-400">{text}</div>
    </div>
  )
}
