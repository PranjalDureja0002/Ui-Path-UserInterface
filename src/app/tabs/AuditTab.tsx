import { motion } from 'framer-motion'
import {
  ChevronDown,
  CornerUpLeft,
  CornerUpRight,
  Download,
  FileText,
  FileVideo,
  Image as ImageIcon,
  MoreVertical,
  Network,
  Paperclip,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { useStore } from '../../store/store'
import { ArtifactCard } from '../../components/ArtifactCard'
import { Badge, Chip, Empty, Eyebrow, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import type { CaseView } from '../../types'
import feedbackImg from '../../assets/feedback.png'

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

// Gmail-style attachment card — file-type icon + name + download on hover.
const ATT_STYLE: Record<string, { icon: typeof FileText; hex: string }> = {
  pdf: { icon: FileText, hex: '#EA4335' },
  mp4: { icon: FileVideo, hex: '#7C5CDB' },
  mov: { icon: FileVideo, hex: '#7C5CDB' },
  jpg: { icon: ImageIcon, hex: '#1AA251' },
  jpeg: { icon: ImageIcon, hex: '#1AA251' },
  png: { icon: ImageIcon, hex: '#1AA251' },
  txt: { icon: FileText, hex: '#5F6368' },
}

function GmailAttachment({ name }: { name: string }) {
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  const { icon: Icon, hex } = ATT_STYLE[ext] ?? { icon: Paperclip, hex: '#5F6368' }
  return (
    <div className="group relative flex w-[212px] items-center gap-2.5 rounded-lg border border-ink-900/[0.14] bg-white px-3 py-2.5 transition-colors hover:bg-paper-50">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${hex}14`, color: hex }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium text-ink-800">{name}</div>
        <div className="text-[10.5px] uppercase tracking-wide text-ink-400">{ext} file</div>
      </div>
      <Download
        size={15}
        className="shrink-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  )
}

function EmailCard({ c }: { c: CaseView }) {
  if (!c.audit) return null
  const { email, attachments } = c.audit
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="overflow-hidden rounded-2xl border border-ink-900/[0.08] bg-white shadow-card-soft"
    >
      {/* Subject + label */}
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <h2 className="text-[20px] font-normal leading-snug tracking-tight text-ink-900">{email.subject}</h2>
        <Badge tone="ok" className="mt-1 shrink-0">Sent</Badge>
      </div>

      {/* Sender row — Gmail header */}
      <div className="flex items-start gap-3.5 px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet text-[15px] font-semibold text-white">
          F
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5">
            <span className="text-[14px] font-semibold text-ink-900">FOREMAN</span>
            <span className="text-[12.5px] text-ink-400">&lt;audit@foreman.ops&gt;</span>
            <span className="ml-auto text-[12px] text-ink-400">just now</span>
          </div>
          <button className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink-500">
            to {email.to}
            <ChevronDown size={14} className="text-ink-400" />
          </button>
        </div>
        <div className="hidden items-center gap-3 text-ink-300 sm:flex">
          <Star size={16} />
          <CornerUpLeft size={16} />
          <MoreVertical size={16} />
        </div>
      </div>

      {/* Body */}
      <div className="whitespace-pre-line px-6 pb-5 pl-[4.6rem] text-[13.5px] leading-relaxed text-ink-700">
        {email.body}
      </div>

      {/* Attachments — Gmail cards */}
      {attachments.length > 0 && (
        <div className="px-6 pb-6 pl-[4.6rem]">
          <div className="mb-2.5 flex items-center gap-1.5 text-[12.5px] text-ink-500">
            <Paperclip size={13} />
            {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {attachments.map((att) => (
              <GmailAttachment key={att} name={att} />
            ))}
          </div>
        </div>
      )}

      {/* Reply bar */}
      <div className="flex items-center gap-2 border-t border-ink-900/[0.06] px-6 py-3">
        <button className="inline-flex items-center gap-2 rounded-full border border-ink-900/[0.14] px-4 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-paper-50">
          <CornerUpLeft size={14} /> Reply
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-ink-900/[0.14] px-4 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-paper-50">
          <CornerUpRight size={14} /> Forward
        </button>
      </div>
    </motion.div>
  )
}

function FeedbackRow({ c }: { c: CaseView }) {
  const verdict = c.feedback
  const awaiting = useStore((s) => s.replay.awaitingFeedback)
  const submit = useStore((s) => s.submitFeedback)
  const decided = Boolean(verdict)
  const canVote = awaiting && !decided

  const blurb = canVote
    ? 'Approve to learn from this case — the Knowledge Graph records the root and the skill is written. Open the Skills and Fleet tabs to watch it update live.'
    : verdict === 'up'
      ? 'Approved — this case is now part of the system’s memory: the graph recorded the root and the skill was written.'
      : verdict === 'down'
        ? 'Logged as a counter-example — nothing was learned from this case.'
        : 'When the case closes, your thumbs-up writes the learning back into the Knowledge Graph and the skill library.'

  return (
    <div className={clsx('panel overflow-hidden transition-shadow', canVote && 'shadow-glow ring-1 ring-brand-400/40')}>
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-[300px_1fr]">
        {/* Left — the human-feedback-loop graphic */}
        <div className="relative hidden items-center justify-center overflow-hidden border-r border-ink-900/[0.06] bg-mesh-pastel-soft p-7 lg:flex">
          <img
            src={feedbackImg}
            alt="Human feedback loop — a thumbs-up or thumbs-down feeds the learning"
            className="relative w-full max-w-[220px] drop-shadow-[0_24px_48px_rgba(20,23,28,0.14)]"
          />
        </div>

        {/* Right — heading, prompt, the interactive gate */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand-600">
                Human feedback
              </div>
              <h3 className="mt-1 font-display text-xl font-bold tracking-tightest text-ink-900">
                The learning gate
              </h3>
            </div>
            {canVote ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                </span>
                Your call
              </span>
            ) : !decided ? (
              <Chip className="shrink-0 text-ink-400">Awaiting closure</Chip>
            ) : (
              <Badge tone={verdict === 'up' ? 'ok' : 'danger'}>
                {verdict === 'up' ? 'Learned' : 'Not learned'}
              </Badge>
            )}
          </div>

          <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-ink-500">{blurb}</p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FeedbackButton
              active={verdict === 'up'}
              tone="ok"
              icon={<ThumbsUp size={20} />}
              label="Learn from this"
              activeLabel="Captured — skill written"
              canVote={canVote}
              dim={decided && verdict !== 'up'}
              onVote={() => submit('up')}
            />
            <FeedbackButton
              active={verdict === 'down'}
              tone="danger"
              icon={<ThumbsDown size={20} />}
              label="Don't learn — counter-example"
              activeLabel="Logged — kept as a counter-example"
              canVote={canVote}
              dim={decided && verdict !== 'down'}
              onVote={() => submit('down')}
            />
          </div>
        </div>
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
  canVote,
  dim,
  onVote,
}: {
  active: boolean
  tone: 'ok' | 'danger'
  icon: React.ReactNode
  label: string
  activeLabel: string
  canVote: boolean
  dim: boolean
  onVote: () => void
}) {
  const hex = tone === 'ok' ? '#1aa251' : '#e23b3b'
  const clickable = canVote && !active
  return (
    <button
      type="button"
      onClick={clickable ? onVote : undefined}
      disabled={!clickable}
      className={clsx(
        'flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all',
        active
          ? 'border-transparent'
          : clickable
            ? 'cursor-pointer border-ink-900/[0.10] bg-white hover:-translate-y-0.5 hover:shadow-card-light'
            : clsx('border-ink-900/[0.06] bg-ink-900/[0.02]', dim ? 'opacity-40' : 'opacity-60'),
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
            : clickable
              ? { background: `${hex}14`, color: hex }
              : { background: 'rgba(20,23,28,0.04)', color: '#969ca5' }
        }
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={clsx('block text-[13px] font-semibold', active ? 'text-ink-900' : 'text-ink-700')}>
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
