import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Phone, ShieldCheck } from 'lucide-react'
import { useStore } from '../../store/store'
import { Empty, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import phoneCall from '../../assets/phone-call.jpg'
import type { CallState, CaseView } from '../../types'

export function CallsTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  if (!c) return <Empty icon={<Phone size={22} />} text="No active case — press play in the top bar." />

  const call = c.call
  const hasTranscript = call.lines.length > 0

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="Escalation · Twilio voice"
        title="The phone call"
        sub="Risk above the policy threshold triggers a real escalation call to the right approver; FOREMAN states the case and captures the decision."
      />

      <CallStage c={c} />

      {(hasTranscript || call.decision) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">{hasTranscript && <Transcript call={call} />}</div>
          <div className="lg:col-span-5">
            {call.decision ? <DecisionCard call={call} /> : <DecisionPending />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Cinematic call hero (phone-wave image + adaptive state) ─────────────────
function CallStage({ c }: { c: CaseView }) {
  const call = c.call
  const dialing = call.status === 'dialing'
  const connected = call.status === 'connected'
  const ended = call.status === 'ended'
  const idle = call.status === 'idle'
  const risk = c.risk_score
  const pending = idle && risk != null && risk >= 0.7
  const resolved = idle && risk != null && risk < 0.7
  const live = dialing || connected

  const title = ended
    ? 'Authorised by voice'
    : connected
      ? 'Connected'
      : dialing
        ? 'Dialing the approver…'
        : pending
          ? 'Escalation pending'
          : resolved
            ? 'No call needed'
            : 'Standing by'

  return (
    <div className="panel relative overflow-hidden">
      <div className="relative h-[260px] w-full overflow-hidden bg-carbon-950 sm:h-[300px]">
        {/* phone-wave image, right side, faded into the dark stage */}
        <img
          src={phoneCall}
          alt=""
          className="absolute right-0 top-0 h-full w-[64%] object-cover"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon-950 via-carbon-950/72 to-carbon-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon-950/70 to-transparent" />

        {/* live glow over the wave when the line is active */}
        {live && (
          <div
            className="absolute right-[22%] top-1/2 h-44 w-72 -translate-y-1/2 animate-pulse rounded-full blur-3xl"
            style={{ background: connected ? 'rgba(80,180,255,0.34)' : 'rgba(245,166,35,0.30)' }}
          />
        )}

        {/* content */}
        <div className="absolute inset-0 flex flex-col justify-center p-7 sm:p-9">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
            <Phone size={13} /> Escalation · Twilio voice
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[30px] font-bold leading-none tracking-tight text-white sm:text-[36px]">
              {title}
            </h2>
            <CallPill status={call.status} pending={pending} resolved={resolved} />
          </div>
          <div className="mt-3 max-w-md text-[13px] leading-relaxed text-white/75">
            {idle ? (
              pending ? (
                'High risk — FOREMAN is preparing the escalation call to the right approver.'
              ) : resolved ? (
                <>Risk <span className="font-mono font-semibold text-white">{risk}</span> is below the 0.70 threshold — auto-resolved and logged.</>
              ) : (
                'A call only happens when the risk score crosses 0.70.'
              )
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="text-white/55">to</span>
                <span className="font-medium text-white">{call.toRole}</span>
                <span className="text-white/30">·</span>
                <span className="font-mono text-white/80">{call.to}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CallPill({
  status,
  pending,
  resolved,
}: {
  status: CallState['status']
  pending?: boolean
  resolved?: boolean
}) {
  if (status === 'dialing') return <DarkPill hex="#f5a623" pulse>Dialing…</DarkPill>
  if (status === 'connected') return <DarkPill hex="#34c759" live>Connected</DarkPill>
  if (status === 'ended') return <DarkPill hex="#34c759">Authorised</DarkPill>
  if (pending) return <DarkPill hex="#f5a623" pulse>Escalation pending</DarkPill>
  if (resolved) return <DarkPill hex="#34c759">Auto-resolved</DarkPill>
  return <DarkPill hex="#9aa1aa">Idle</DarkPill>
}

function DarkPill({ children, hex, pulse, live }: { children: ReactNode; hex: string; pulse?: boolean; live?: boolean }) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold', pulse && 'animate-pulse')}
      style={{ background: `${hex}22`, color: hex, border: `1px solid ${hex}44` }}
    >
      <span className="relative flex h-2 w-2">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: hex }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: hex }} />
      </span>
      {children}
    </span>
  )
}

// ── Transcript ───────────────────────────────────────────────────────────────
function Transcript({ call }: { call: CallState }) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-ink-500">
        <Phone size={14} /> Live transcript
      </div>
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
                      ? 'rounded-tl-sm border-brand-400/20 bg-brand-500/[0.07]'
                      : 'rounded-tr-sm border-ink-900/[0.07] bg-ink-900/[0.04]',
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

// ── Decision ─────────────────────────────────────────────────────────────────
function DecisionPending() {
  return (
    <div className="panel flex h-full min-h-[160px] items-center justify-center p-5">
      <Empty icon={<ShieldCheck size={20} />} text="Awaiting the decision on the line…" />
    </div>
  )
}

function DecisionCard({ call }: { call: CallState }) {
  const d = call.decision
  if (!d) return null
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
          <div className="font-display text-lg font-bold tracking-tightest text-ink-900">Authorised by voice</div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-500">{d.by} · {d.at}</div>
        </div>
      </div>

      <div className="mt-4 border-t border-ok/15 pt-4">
        <div className="text-[11px] uppercase tracking-wide text-ink-400">Authorised actions</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.actions.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-ok"
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
