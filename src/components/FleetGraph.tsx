import { motion } from 'framer-motion'
import { Boxes, Building2, MapPin, Factory } from 'lucide-react'
import type { FleetEdge, FleetNode } from '../types'
import { clsx } from '../lib/format'

const STATUS_COLOR: Record<string, string> = {
  corroded: '#e23b3b',
  failing: '#e23b3b',
  at_risk: '#c77b08',
  healthy: '#1aa251',
}

function nodeColor(n?: FleetNode): string {
  if (n?.status && STATUS_COLOR[n.status]) return STATUS_COLOR[n.status]
  return '#5b6573'
}

function severity(status?: string): number {
  if (status === 'corroded' || status === 'failing') return 3
  if (status === 'at_risk') return 2
  return 1
}

const NODE_ICON = { site: MapPin, batch: Boxes, vendor: Factory, cluster: Building2 }

export function FleetGraph({
  nodes,
  edges,
  className,
}: {
  nodes: FleetNode[]
  edges: FleetEdge[]
  className?: string
}) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <div
      className={clsx(
        'relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink-900/[0.06] bg-paper-50/60',
        className,
      )}
    >
      {/* canvas backdrop — faint grid + a soft glow under the hub */}
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.045] blur-3xl" />

      {/* edges — drawn first, beneath the nodes */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {edges.map((e, i) => {
          const a = byId[e.from]
          const b = byId[e.to]
          if (!a || !b) return null
          const sev = Math.max(severity(a.status), severity(b.status))
          const accent = severity(a.status) >= severity(b.status) ? nodeColor(a) : nodeColor(b)
          const hot = sev >= 2
          return (
            <g key={i}>
              {/* soft halo so the connection reads on the light canvas */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={accent}
                strokeOpacity={hot ? 0.1 : 0.05}
                strokeWidth={hot ? 3.2 : 2.2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* base line */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={accent}
                strokeOpacity={hot ? 0.32 : 0.2}
                strokeWidth={hot ? 1 : 0.85}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* flowing pulse along hot edges — "the blast spreading" */}
              {hot && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={accent}
                  strokeOpacity={0.9}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeDasharray="0.1 5"
                  vectorEffect="non-scaling-stroke"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-30"
                    dur={sev >= 3 ? '1s' : '1.6s'}
                    repeatCount="indefinite"
                  />
                </line>
              )}
            </g>
          )
        })}
      </svg>

      {/* nodes */}
      {nodes.map((n, i) => {
        const color = nodeColor(n)
        const Icon = NODE_ICON[n.type]
        const hub = n.type === 'batch'
        const critical = n.status === 'corroded' || n.status === 'failing'
        const size = hub ? 'h-12 w-12' : n.type === 'vendor' ? 'h-9 w-9' : 'h-10 w-10'
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 220, damping: 18 }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${n.x}%`, top: `${n.y}%`, zIndex: critical ? 20 : hub ? 15 : 10 }}
          >
            <span className="relative flex items-center justify-center">
              {/* pulsing ring on the failing origin */}
              {critical && (
                <>
                  <span
                    className="absolute h-full w-full animate-ping rounded-full opacity-60"
                    style={{ background: `${color}40` }}
                  />
                  <span
                    className="absolute -inset-2 rounded-full"
                    style={{ boxShadow: `0 0 0 1px ${color}33` }}
                  />
                </>
              )}
              <div
                className={clsx(
                  'relative flex items-center justify-center rounded-2xl border bg-white shadow-card-soft',
                  size,
                )}
                style={{
                  background: `linear-gradient(180deg, #ffffff, ${color}10)`,
                  borderColor: `${color}80`,
                  color,
                  boxShadow: critical
                    ? `0 0 22px -4px ${color}, 0 1px 2px rgba(20,23,28,0.06)`
                    : hub
                      ? `0 0 18px -6px ${color}aa, 0 1px 2px rgba(20,23,28,0.06)`
                      : undefined,
                }}
              >
                <Icon size={hub ? 21 : n.type === 'vendor' ? 16 : 18} strokeWidth={2.2} />
              </div>
            </span>
            <div
              className="mt-1.5 whitespace-nowrap rounded-md border border-ink-900/[0.08] bg-white/95 px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-sm backdrop-blur-sm"
              style={{ color }}
            >
              {n.label}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
