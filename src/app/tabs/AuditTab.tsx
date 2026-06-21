import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText,
  Mail,
  Network,
  Paperclip,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { useStore } from '../../store/store'
import { ArtifactCard } from '../../components/ArtifactCard'
import { Badge, Chip, Empty, Eyebrow, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import type { CaseView } from '../../types'

export function AuditTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))

  if (!c || (!c.audit && c.artifacts.length === 0)) {
    return (
      <Empty
        icon={<FileText size={26} />}
        text="No closure pack yet — it assembles in the Close stage."
      />
    )
  }

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="Closure · audit + learn"
        title="The defensible paper trail"
        sub="Every case closes into one cited audit pack — emailed, attached, logged."
      />

      <EmailCard c={c} />

      {c.artifacts.length > 0 && (
        <div>
          <Eyebrow>Artifacts produced</Eyebrow>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {c.artifacts.map((a) => (
              <ArtifactCard key={a.id} a={a} />
            ))}
          </div>
        </div>
      )}

      {c.graphNote && (
        <div className="flex items-center gap-2.5 rounded-xl border border-info/25 bg-info/[0.06] px-4 py-3 text-[12.5px] text-ink-700">
          <Network size={16} className="shrink-0 text-info" />
          <span>{c.graphNote}</span>
        </div>
      )}

      <FeedbackRow c={c} />
    </div>
  )
}

function EmailCard({ c }: { c: CaseView }) {
  if (!c.audit) return null
  const { email, attachments } = c.audit
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="panel overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-900/[0.07] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600">
              <Mail size={17} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink-900">{email.subject}</div>
              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-ink-500">
                <span className="text-ink-400">To:</span>
                <span className="truncate">{email.to}</span>
              </div>
            </div>
          </div>
          <Badge tone="ok">Sent</Badge>
        </div>

        <div className="px-5 py-4">
          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-700">
            {email.body}
          </p>

          {attachments.length > 0 && (
            <div className="mt-4 border-t border-ink-900/[0.07] pt-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-400">
                <Paperclip size={12} />
                {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((att) => (
                  <Chip key={att} icon={<FileText size={11} />} className="text-ink-700">
                    {att}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function FeedbackRow({ c }: { c: CaseView }) {
  const verdict = c.feedback
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow className="!text-ink-500">Human feedback · the learning gate</Eyebrow>
        {!verdict && <Chip className="text-ink-400">Awaiting closure</Chip>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FeedbackButton
          active={verdict === 'up'}
          tone="ok"
          icon={<ThumbsUp size={20} />}
          label="Learn from this"
          activeLabel="Captured — skill written"
          idle={!verdict}
        />
        <FeedbackButton
          active={verdict === 'down'}
          tone="danger"
          icon={<ThumbsDown size={20} />}
          label="Remember the mistake — don't learn"
          activeLabel="Logged — kept as a counter-example"
          idle={!verdict}
        />
      </div>
    </div>
  )
}

function FeedbackButton({
  active,
  tone,
  icon,
  label,
  activeLabel,
  idle,
}: {
  active: boolean
  tone: 'ok' | 'danger'
  icon: React.ReactNode
  label: string
  activeLabel: string
  idle: boolean
}) {
  const hex = tone === 'ok' ? '#1aa251' : '#e23b3b'
  return (
    <button
      type="button"
      className={clsx(
        'flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all',
        active
          ? 'border-transparent'
          : idle
            ? 'border-ink-900/[0.07] bg-ink-900/[0.02] hover:bg-ink-900/[0.05]'
            : 'border-ink-900/[0.06] bg-ink-900/[0.02] opacity-40',
      )}
      style={
        active
          ? { background: `${hex}1f`, border: `1px solid ${hex}44`, boxShadow: `0 0 24px -8px ${hex}` }
          : undefined
      }
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={
          active
            ? { background: `${hex}26`, color: hex }
            : { background: 'rgba(255,255,255,0.04)', color: '#969ca5' }
        }
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={clsx(
            'block text-[13px] font-semibold',
            active ? 'text-ink-900' : 'text-ink-700',
          )}
        >
          {label}
        </span>
        {active && (
          <span className="mt-0.5 block text-[11.5px] font-medium" style={{ color: hex }}>
            {activeLabel}
          </span>
        )}
      </span>
    </button>
  )
}
