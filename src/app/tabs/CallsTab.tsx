import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Phone, PhoneOff, ShieldCheck } from 'lucide-react'
import { useStore } from '../../store/store'
import { Badge, Chip, Empty, Eyebrow, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import type { CallState, CaseView } from '../../types'

export function CallsTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  if (!c) return <Empty icon={<Phone size={22} />} text="No active case — press play in the top bar." />

  const call = c.call
  const live = call.status === 'dialing' || call.status === 'connected'
  const noCall = call.status === 'idle'

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="Escalation · Twilio voice"
        title="The phone call"
        sub="Risk above 0.70 triggers a real call; FOREMAN captures the decision."
      />

      {/* No-call info case */}
      {noCall ? (
        <NoCallPanel c={c} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left — call card + transcript */}
          <div className="space-y-5 lg:col-span-7">
            <CallCard call={call} live={live} />
            <Transcript call={call} />
          </div>

          {/* Right — decision */}
          <div className="lg:col-span-5">
            <DecisionCard call={call} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Twilio-style call card with status pill + calling visual ─────────────────
function CallCard({ call, live }: { call: CallState; live: boolean }) {
  const connected = call.status === 'connected'
  const ended = call.status === 'ended'

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Phone icon in colored circle with pulsing rings while live */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            {live && (
              <>
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-50"
                  style={{ background: connected ? '#1aa251' : '#c77b08' }}
                />
                <span
                  className="absolute -inset-1.5 animate-ping rounded-full opacity-30"
                  style={{ animationDelay: '0.3s', background: connected ? '#1aa251' : '#c77b08' }}
                />
                <span
                  className="absolute -inset-3 animate-ping rounded-full opacity-20"
                  style={{ animationDelay: '0.6s', background: connected ? '#1aa251' : '#c77b08' }}
                />
              </>
            )}
            <div
              className="relative flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: ended ? '#969ca522' : connected ? '#1aa25122' : '#c77b0822',
                color: ended ? '#969ca5' : connected ? '#1aa251' : '#c77b08',
                border: `1px solid ${ended ? '#969ca544' : connected ? '#1aa25144' : '#c77b0844'}`,
              }}
            >
              {ended ? <PhoneOff size={22} /> : <Phone size={22} />}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-400">
              {call.toRole ?? 'Escalation contact'}
            </div>
            <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink-900">
              {call.to ?? '—'}
            </div>
          </div>
        </div>

        <StatusPill call={call} />
      </div>

      {/* Animated sound bars while connected */}
      {connected && (
        <div className="mt-5 flex items-end gap-1 border-t border-ink-900/[0.07] pt-4">
          {Array.from({ length: 28 }).map((_, i) => (
            <motion.span
              key={i}
              className="w-1 rounded-full bg-ok/60"
              initial={{ height: 4 }}
              animate={{ height: [4, 6 + ((i * 7) % 22), 4] }}
              transition={{
                duration: 0.8 + (i % 5) * 0.12,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i % 7) * 0.06,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPill({ call }: { call: CallState }) {
  if (call.status === 'dialing')
    return (
      <Badge tone="warn" className="animate-pulse">
        Dialing…
      </Badge>
    )
  if (call.status === 'connected')
    return (
      <Badge tone="ok">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
        </span>
        Connected
      </Badge>
    )
  if (call.status === 'ended')
    return <Chip className="text-ink-400">Call ended</Chip>
  return null
}

// ── Chat-style transcript ────────────────────────────────────────────────────
function Transcript({ call }: { call: CallState }) {
  if (call.lines.length === 0) return null
  return (
    <div className="panel p-4">
      <Eyebrow className="px-1 pb-3">Live transcript</Eyebrow>
      <div className="space-y-3">
        <AnimatePresence initial>
          {call.lines.map((line, i) => {
            const foreman = line.speaker === 'foreman'
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={clsx('flex', foreman ? 'justify-start' : 'justify-end')}
              >
                <div
                  className={clsx(
                    'max-w-[78%] rounded-2xl border px-3.5 py-2.5',
                    foreman
                      ? 'rounded-tl-sm border-brand-400/20 bg-brand-500/15'
                      : 'rounded-tr-sm border-ink-900/[0.07] bg-ink-900/[0.05]',
                  )}
                >
                  <div
                    className={clsx(
                      'mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em]',
                      foreman ? 'text-brand-600/80' : 'text-ink-400',
                    )}
                  >
                    {foreman ? 'FOREMAN' : 'MANAGER'}
                  </div>
                  <div className="text-[13px] leading-relaxed text-ink-900">{line.text}</div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Captured decision card ───────────────────────────────────────────────────
function DecisionCard({ call }: { call: CallState }) {
  const d = call.decision
  if (!d)
    return (
      <div className="panel flex h-full min-h-[180px] items-center justify-center p-5">
        <Empty icon={<ShieldCheck size={20} />} text="Awaiting the decision on the line…" />
      </div>
    )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-[136px] rounded-2xl border border-ok/30 bg-ok/[0.06] p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ok/15 text-ok">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <div className="font-display text-lg font-bold tracking-tightest text-ink-900">
            Authorised by voice
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-500">
            {d.by} · {d.at}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-ok/15 pt-4">
        <div className="text-[11px] uppercase tracking-wide text-ink-400">Authorised actions</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.actions.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-ok"
            >
              <CheckCircle2 size={11} />
              {a}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Elegant "no call needed" info panel ──────────────────────────────────────
function NoCallPanel({ c }: { c: CaseView }) {
  const risk = c.risk_score
  const scored = risk != null
  const pending = scored && risk >= 0.7 // high risk, call about to start
  const tone = pending ? '#c77b08' : '#1aa251'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-6"
      style={{ borderColor: `${tone}40`, background: `${tone}0d` }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${tone}26`, color: tone }}
        >
          {pending ? <Phone size={24} /> : <CheckCircle2 size={24} />}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold tracking-tightest text-ink-900">
            {pending ? 'Escalation pending' : 'No call needed'}
          </h3>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-ink-700">
            {pending ? (
              <>
                Risk <span className="font-mono font-semibold" style={{ color: tone }}>{risk}</span> is
                above 0.70 — FOREMAN is preparing the escalation call.
              </>
            ) : scored ? (
              <>
                Risk <span className="font-mono font-semibold text-ok">{risk}</span> is below the 0.70
                threshold — FOREMAN auto-resolved the routine fix and logged it.
              </>
            ) : (
              <>No escalation yet — the call only happens when risk crosses 0.70.</>
            )}
          </p>
          {scored && !pending && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip className="text-ok">below 0.70 threshold</Chip>
              <Chip className="text-ink-500">auto-resolved</Chip>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
