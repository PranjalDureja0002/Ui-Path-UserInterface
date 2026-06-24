import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  AudioLines,
  Clock,
  ExternalLink,
  FileStack,
  Image as ImageIcon,
  Images,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pause,
  Play,
  User,
  Video,
} from 'lucide-react'
import { useStore } from '../../store/store'
import { Chip, Empty, TabHeader } from '../../components/ui'
import { clsx } from '../../lib/format'
import type { CaseView, ChatMessage, MediaItem } from '../../types'

export function MediaBoardTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  if (!c) return <Empty icon={<Images size={26} />} text="No active case — press play in the top bar." />

  const media = c.media ?? []
  const videos = media.filter((m) => m.kind === 'video')
  const images = media.filter((m) => m.kind === 'image')
  const audios = media.filter((m) => m.kind === 'audio')
  const docs = media.filter((m) => m.kind === 'document')
  const report = c.chat.find((m) => m.from === 'worker')

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="Multimodal capture"
        title="MediaBoard"
        sub="Everything captured on the channel — video, images, audio and documents, rendered in one view."
        right={
          media.length > 0 ? (
            <>
              {videos.length > 0 && <Chip>{videos.length} video</Chip>}
              {images.length > 0 && <Chip>{images.length} image{images.length > 1 ? 's' : ''}</Chip>}
              {audios.length > 0 && <Chip>{audios.length} audio</Chip>}
              {docs.length > 0 && <Chip>{docs.length} doc{docs.length > 1 ? 's' : ''}</Chip>}
            </>
          ) : undefined
        }
      />

      <SourceStrip c={c} />

      {media.length === 0 ? (
        <div className="panel">
          <Empty icon={<Images size={24} />} text="No media yet — it arrives at Intake when the engineer sends it." />
        </div>
      ) : (
        <>
          {report && <TextReport msg={report} name={c.worker_name} />}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {videos[0] && (
              <div className="lg:col-span-7">
                <VideoCard m={videos[0]} />
              </div>
            )}
            {audios[0] && (
              <div className="lg:col-span-5">
                <AudioCard m={audios[0]} />
              </div>
            )}
          </div>

          {(images.length > 0 || docs.length > 0) && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {images.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-8">
                  {images.map((img) => (
                    <ImageCard key={img.label} m={img} />
                  ))}
                </div>
              )}
              {docs[0] && (
                <div className="lg:col-span-4">
                  <DocumentCard m={docs[0]} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Source strip ────────────────────────────────────────────────────────────
function SourceStrip({ c }: { c: CaseView }) {
  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#1aa251]">
          <MessageCircle size={16} />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-ink-900">WhatsApp intake</div>
          <div className="font-mono text-[10.5px] text-ink-400">via Twilio · {c.case_id}</div>
        </div>
      </div>
      <span className="hidden h-8 w-px bg-ink-900/[0.08] sm:block" />
      {c.worker_name && <Meta icon={User} label={c.worker_name} />}
      {c.site_id && <Meta icon={MapPin} label={c.site_id} />}
      {c.opened_at && <Meta icon={Clock} label={`opened ${c.opened_at}`} />}
    </div>
  )
}

function Meta({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12.5px] text-ink-600">
      <Icon size={13.5} className="text-ink-400" />
      {label}
    </div>
  )
}

// ── The engineer's text report ──────────────────────────────────────────────
function TextReport({ msg, name }: { msg: ChatMessage; name: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -left-6 -top-8 font-serif text-[120px] leading-none text-ink-900/[0.04]">“</div>
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
          <MessageSquareText size={13} /> Field report · text
        </div>
        <p className="mt-3 max-w-3xl text-[18px] font-medium leading-relaxed text-ink-900">{msg.text}</p>
        <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-500">
          <User size={13} className="text-ink-400" />
          <span className="font-medium text-ink-700">{name}</span>
          <span className="text-ink-300">·</span>
          <span className="font-mono text-[11px]">{msg.ts}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Card header ─────────────────────────────────────────────────────────────
function CardHeader({ icon: Icon, title, right }: { icon: LucideIcon; title: string; right?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-900/[0.07] px-4 py-3">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">
        <Icon size={14} /> {title}
      </div>
      {right && <span className="font-mono text-[10.5px] text-ink-400">{right}</span>}
    </div>
  )
}

// ── Video ───────────────────────────────────────────────────────────────────
function VideoCard({ m }: { m: MediaItem }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="panel overflow-hidden">
      <CardHeader icon={Video} title="Video" right={m.meta} />
      <button
        onClick={() => setPlaying((p) => !p)}
        className="group relative block aspect-video w-full overflow-hidden text-left"
      >
        {/* faux paused frame — dark scene with a warm burn glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-carbon-700 via-carbon-900 to-black" />
        <div className="absolute left-[56%] top-[46%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/30 blur-2xl" />
        <div className="absolute left-[56%] top-[46%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/40 blur-md" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ background: 'repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)' }}
        />
        {/* play / pause */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-xl backdrop-blur transition-transform group-hover:scale-105">
            {!playing && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={26} className="ml-1" fill="currentColor" />}
          </span>
        </span>
        <span className="absolute left-3 top-3 rounded-md bg-black/45 px-2 py-1 font-mono text-[10px] font-medium text-white backdrop-blur">
          {m.label}
        </span>
        {/* scrubber */}
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3 text-[11px] text-white/85">
          <Play size={11} fill="currentColor" />
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <span className={clsx('block h-full rounded-full bg-white transition-all', playing ? 'w-[48%]' : 'w-[18%]')} />
          </span>
          <span className="font-mono">{m.duration ?? '—'}</span>
        </span>
      </button>
      {m.note && <div className="px-4 py-3 text-[12.5px] leading-relaxed text-ink-600">{m.note}</div>}
    </div>
  )
}

// ── Audio (the waveform) ────────────────────────────────────────────────────
function AudioCard({ m }: { m: MediaItem }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="panel flex h-full flex-col">
      <CardHeader icon={AudioLines} title="Audio" right={m.meta ?? m.duration} />
      <div className="flex flex-1 flex-col justify-center px-5 py-6">
        <Waveform playing={playing} />
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-glow transition-transform hover:scale-105"
          >
            {playing ? <Pause size={17} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold text-ink-900">{m.label}</div>
            <div className="font-mono text-[10.5px] text-ink-400">{playing ? '0:09' : '0:00'} / {m.duration ?? '—'}</div>
          </div>
        </div>
        {m.note && (
          <div className="mt-3 rounded-lg border border-ink-900/[0.06] bg-paper-50 px-3 py-2 text-[11.5px] italic leading-relaxed text-ink-500">
            “{m.note}”
          </div>
        )}
      </div>
    </div>
  )
}

// deterministic symmetric envelope (bell-shaped, dense) — recreates AudioWave.png
const BARS = Array.from({ length: 76 }, (_, i) => {
  const t = i / 75
  const env = Math.pow(Math.sin(Math.PI * t), 0.5)
  const noise = 0.4 + 0.6 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.73))
  return Math.max(0.14, env * noise)
})

function Waveform({ playing }: { playing: boolean }) {
  return (
    <div className="relative flex h-28 items-center justify-center gap-[2px]">
      {BARS.map((h, i) => {
        const t = i / (BARS.length - 1)
        const central = 1 - Math.abs(t - 0.5) * 2 // 1 at centre → 0 at edges
        const light = 56 + central * 10
        const sat = 72 + central * 22
        return (
          <span
            key={i}
            className={clsx('w-[3px] origin-center rounded-full', playing && 'animate-waveform')}
            style={{
              height: `${Math.round(h * 100)}%`,
              background: `hsl(213, ${sat}%, ${light}%)`,
              animationDelay: `${(i % 13) * 0.06}s`,
              animationDuration: `${1 + (i % 5) * 0.12}s`,
              transform: playing ? undefined : `scaleY(${0.7 + central * 0.3})`,
            }}
          />
        )
      })}
      {/* circular playhead + centre line — the reference motif */}
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-400/50" />
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-px -translate-x-1/2 -translate-y-1/2 bg-brand-400/60" />
    </div>
  )
}

// ── Image (annotated inspection photo) ──────────────────────────────────────
function ImageCard({ m }: { m: MediaItem }) {
  const thermal = /thermal/i.test(m.label)
  return (
    <div className="panel overflow-hidden">
      <CardHeader icon={ImageIcon} title={thermal ? 'Image · thermal' : 'Image'} right={m.meta} />
      <div className="relative aspect-[4/3] overflow-hidden">
        {thermal ? (
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(38% 40% at 54% 42%, #ff3b3b 0%, #ff8c00 26%, #ffe000 42%, #2ec27e 60%, #1d84d6 80%, #102a6b 100%)' }}
          />
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(62% 60% at 50% 46%, #6b3a1f 0%, #2a1810 58%, #120c0a 100%)' }} />
            <div className="absolute left-1/2 top-[46%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/40 blur-xl" />
            <div className="absolute left-1/2 top-[46%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/60 blur-sm" />
          </>
        )}
        {/* detection box */}
        <div className="absolute left-[27%] top-[28%] h-[42%] w-[46%] rounded-[3px] border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]">
          <span className="absolute -top-[22px] left-0 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-ink-900 shadow">
            {thermal ? '82°C hot-spot' : 'melted MC4 · charred + pin'}
          </span>
        </div>
        <span className="absolute left-3 top-3 rounded-md bg-black/45 px-2 py-1 font-mono text-[10px] font-medium text-white backdrop-blur">
          {m.label}
        </span>
      </div>
      {m.note && <div className="px-4 py-3 text-[12px] leading-relaxed text-ink-600">{m.note}</div>}
    </div>
  )
}

// ── Document ────────────────────────────────────────────────────────────────
function DocumentCard({ m }: { m: MediaItem }) {
  return (
    <div className="panel flex h-full flex-col">
      <CardHeader icon={FileStack} title="Document" right={m.meta} />
      <div className="flex flex-1 items-center gap-4 px-5 py-5">
        {/* faux page */}
        <div className="relative h-28 w-[5.5rem] shrink-0 rounded-lg border border-ink-900/10 bg-white shadow-card-soft">
          <div className="absolute right-0 top-0 h-5 w-5 rounded-bl-lg border-b border-l border-ink-900/10 bg-paper-100" />
          <div className="space-y-1.5 p-3 pt-5">
            {[10, 8, 9, 6, 8, 5].map((w, i) => (
              <div key={i} className="h-1 rounded-full bg-ink-900/10" style={{ width: `${w * 9}%` }} />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink-900">{m.label}</div>
          <div className="font-mono text-[10.5px] text-ink-400">{m.meta}</div>
          {m.note && <div className="mt-2 text-[12px] leading-relaxed text-ink-500">{m.note}</div>}
          <button className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink-900/[0.10] bg-white px-3 py-1.5 text-[11.5px] font-medium text-ink-700 transition-colors hover:bg-paper-50">
            <ExternalLink size={12} /> Open
          </button>
        </div>
      </div>
    </div>
  )
}
