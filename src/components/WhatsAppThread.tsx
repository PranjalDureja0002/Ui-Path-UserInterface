import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileAudio, FileVideo, MessageCircle } from 'lucide-react'
import type { ChatMessage } from '../types'
import { clsx } from '../lib/format'

export function WhatsAppThread({ messages }: { messages: ChatMessage[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [messages.length])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-900/[0.07] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25d366]/15 text-[#1aa251]">
          <MessageCircle size={15} />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-ink-900">WhatsApp · field worker</div>
          <div className="font-mono text-[10px] text-ink-400">via Twilio</div>
        </div>
      </div>

      <div
        ref={ref}
        className="flex-1 space-y-2.5 overflow-y-auto bg-paper-50 px-4 py-4"
        style={{
          backgroundImage: 'radial-gradient(rgba(20,23,28,0.035) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.from === 'foreman'
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={clsx('flex', mine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={clsx(
                    'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-sm',
                    mine
                      ? 'rounded-br-md bg-brand-500 text-white'
                      : 'rounded-bl-md border border-ink-900/[0.07] bg-white text-ink-800',
                  )}
                >
                  {mine && (
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                      FOREMAN
                    </div>
                  )}
                  <div>{m.text}</div>

                  {m.media && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.media.map((md) => (
                        <span
                          key={md.label}
                          className={clsx(
                            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[10px]',
                            mine ? 'bg-black/20 text-white/90' : 'bg-ink-900/[0.05] text-ink-600',
                          )}
                        >
                          {md.kind === 'video' ? <FileVideo size={12} /> : <FileAudio size={12} />}
                          {md.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {m.options && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.options.map((o) => (
                        <span
                          key={o}
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-[11px] font-medium',
                            mine
                              ? 'border border-white/30 bg-white/15 text-white'
                              : 'border border-ink-900/10 bg-ink-900/[0.04] text-ink-600',
                          )}
                        >
                          {o}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={clsx('mt-1 text-right font-mono text-[9px]', mine ? 'text-white/60' : 'text-ink-400')}>
                    {m.ts}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="py-8 text-center text-xs text-ink-400">No messages yet.</div>
        )}
      </div>
    </div>
  )
}
