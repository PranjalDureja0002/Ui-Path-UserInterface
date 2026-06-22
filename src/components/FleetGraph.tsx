import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Boxes,
  Building2,
  Cpu,
  Factory,
  HardHat,
  Layers,
  MapPin,
  Package,
} from 'lucide-react'
import type { FleetEdge, FleetNode, FleetNodeType } from '../types'
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

const NODE_ICON: Record<FleetNodeType, typeof MapPin> = {
  site: MapPin,
  batch: Layers,
  vendor: Factory,
  cluster: Building2,
  crew: HardHat,
  part_lot: Package,
  asset: Cpu,
}

const TYPE_LABEL: Record<FleetNodeType, string> = {
  site: 'site',
  batch: 'batch',
  vendor: 'vendor',
  cluster: 'cluster',
  crew: 'install crew',
  part_lot: 'part lot',
  asset: 'asset',
}

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
  const [hover, setHover] = useState<string | null>(null)

  // which node ids are connected to the hovered one (for the trace highlight)
  const lit = new Set<string>()
  if (hover) {
    lit.add(hover)
    edges.forEach((e) => {
      if (e.from === hover) lit.add(e.to)
      if (e.to === hover) lit.add(e.from)
    })
  }
  const isLit = (id: string) => !hover || lit.has(id)
  const edgeLit = (e: FleetEdge) => !hover || e.from === hover || e.to === hover

  return (
    <div
      className={clsx(
        'relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink-900/[0.06] bg-paper-50/60',
        className,
      )}
    >
      {/* canvas backdrop — faint grid + a soft glow under the hubs */}
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.045] blur-3xl" />

      {/* edges — drawn first, beneath the nodes */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {edges.map((e, i) => {
          const a = byId[e.from]
          const b = byId[e.to]
          if (!a || !b) return null
          const hot = !!e.hot
          // colour by the more-severe endpoint
          const accent = hot ? '#e23b3b' : '#9aa3ae'
          const on = edgeLit(e)
          return (
            <g key={i} opacity={on ? 1 : 0.18} style={{ transition: 'opacity 160ms' }}>
              {/* soft halo so the connection reads on the light canvas */}
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={accent}
                strokeOpacity={hot ? 0.12 : 0.06}
                strokeWidth={hot ? 3.4 : 2.2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* base line */}
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={accent}
                strokeOpacity={hot ? 0.34 : 0.16}
                strokeWidth={hot ? 1.1 : 0.7}
                strokeLinecap="round"
                strokeDasharray={hot ? undefined : '1.4 1.6'}
                vectorEffect="non-scaling-stroke"
              />
              {/* flowing pulse along hot edges — "the blast spreading to the hub" */}
              {hot && (
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#e23b3b"
                  strokeOpacity={0.95}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray="0.1 5"
                  vectorEffect="non-scaling-stroke"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1.2s" repeatCount="indefinite" />
                </line>
              )}
            </g>
          )
        })}
      </svg>

      {/* nodes */}
      {nodes.map((n, i) => {
        const color = nodeColor(n)
        const Icon = NODE_ICON[n.type] ?? Boxes
        const hub = !!n.hub
        const critical = n.status === 'corroded' || n.status === 'failing'
        const size = hub ? 'h-14 w-14' : n.type === 'asset' ? 'h-9 w-9' : 'h-10 w-10'
        const on = isLit(n.id)
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: on ? 1 : 0.32, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 18 }}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center"
            style={{ left: `${n.x}%`, top: `${n.y}%`, zIndex: hub ? 25 : critical ? 20 : 10 }}
          >
            <span className="relative flex items-center justify-center">
              {/* pulsing ring on the failing origin + the culprit hubs */}
              {(critical || hub) && (
                <>
                  <span
                    className="absolute h-full w-full animate-ping rounded-full opacity-50"
                    style={{ background: `${color}40` }}
                  />
                  <span className="absolute -inset-2 rounded-full" style={{ boxShadow: `0 0 0 1px ${color}33` }} />
                  {hub && (
                    <span className="absolute -inset-[7px] rounded-full" style={{ boxShadow: `0 0 0 1px ${color}22` }} />
                  )}
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
                  boxShadow: hub
                    ? `0 0 26px -3px ${color}, 0 1px 2px rgba(20,23,28,0.06)`
                    : critical
                      ? `0 0 20px -5px ${color}, 0 1px 2px rgba(20,23,28,0.06)`
                      : undefined,
                }}
              >
                <Icon size={hub ? 24 : n.type === 'asset' ? 16 : 18} strokeWidth={2.2} />
              </div>
              {/* ROOT badge on the culprit hubs */}
              {hub && (
                <span
                  className="absolute -right-1 -top-2 rounded-full px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wide text-white"
                  style={{ background: color, boxShadow: `0 0 10px ${color}aa` }}
                >
                  root
                </span>
              )}
            </span>
            <div
              className="mt-1.5 flex flex-col items-center whitespace-nowrap rounded-md border border-ink-900/[0.08] bg-white/95 px-1.5 py-0.5 shadow-sm backdrop-blur-sm"
              style={{ color }}
            >
              <span className="font-mono text-[10px] font-semibold leading-none">{n.label}</span>
              <span className="text-[7.5px] uppercase leading-none tracking-wide text-ink-400">
                {TYPE_LABEL[n.type]}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
