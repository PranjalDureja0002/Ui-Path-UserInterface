import { motion } from 'framer-motion'
import { GitBranch, MapPin, Network, ShieldCheck, TrendingDown, Users } from 'lucide-react'
import { useStore } from '../../store/store'
import { FleetGraph } from '../../components/FleetGraph'
import { Badge, Chip, Empty, Kpi, PanelHeader, TabHeader } from '../../components/ui'
import { SERVICE_CONTRACTS, TOTAL_EXPOSURE_PER_HR } from '../../data/entities'
import { inr, inrCompact } from '../../lib/format'
import type { Tone } from '../../lib/hues'
import type { FleetNode } from '../../types'

const STATUS_TONE: Record<string, Tone> = {
  corroded: 'danger',
  failing: 'danger',
  at_risk: 'warn',
  healthy: 'ok',
}

const STATUS_LABEL: Record<string, string> = {
  corroded: 'corroded',
  failing: 'failing',
  at_risk: 'at-risk',
  healthy: 'healthy',
}

export function FleetTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  if (!c) return <Empty text="No active case — press play in the top bar." />
  if (!c.fleet)
    return (
      <Empty
        icon={<GitBranch size={26} />}
        text="No blast-radius yet — the Fleet agent runs during Investigate."
      />
    )

  const fleet = c.fleet
  const nodeById = Object.fromEntries(fleet.nodes.map((n) => [n.id, n])) as Record<string, FleetNode>

  const warrantyRecovered = c.artifacts
    .filter((a) => a.type === 'warranty_claim')
    .reduce((sum, a) => sum + (Number(a.fields.amount_inr) || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-7"
    >
      <TabHeader
        eyebrow="Fleet · Neo4j blast-radius"
        title="One fault, the whole fleet"
        sub="The connection graph predicts which other sites share the failing batch."
        right={
          fleet.systemic ? (
            <Badge tone="danger">
              <Network size={11} /> systemic · {fleet.affected.length} sites
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left — the graph */}
        <div className="lg:col-span-7">
          <div className="panel p-5">
            <PanelHeader
              title="Blast-radius graph"
              icon={<Network size={15} />}
              right={<Chip>{fleet.nodes.length} nodes · {fleet.edges.length} edges</Chip>}
              className="!px-0 !py-0 pb-4"
            />
            <FleetGraph nodes={fleet.nodes} edges={fleet.edges} />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-900/[0.07] pt-4">
              <LegendDot color="#e23b3b" label="failing / corroded" />
              <LegendDot color="#c77b08" label="at-risk" />
              <LegendDot color="#1aa251" label="healthy" />
            </div>
          </div>
        </div>

        {/* Right — money + affected */}
        <div className="space-y-5 lg:col-span-5">
          {/* Money metrics */}
          <div className="panel p-5">
            <PanelHeader
              title="The money story"
              icon={<TrendingDown size={15} />}
              className="!px-0 !py-0 pb-4"
            />
            <div className="grid grid-cols-2 gap-3">
              <Kpi
                icon={<TrendingDown size={16} />}
                value={inrCompact(TOTAL_EXPOSURE_PER_HR) + '/hr'}
                label="SLA exposure avoided"
                tone="warn"
              />
              <Kpi
                icon={<ShieldCheck size={16} />}
                value={inr(warrantyRecovered)}
                label="Warranty recovered"
                tone="ok"
              />
              <Kpi
                icon={<Users size={16} />}
                value={String(SERVICE_CONTRACTS.length)}
                label="Tenants protected"
                tone="info"
              />
              <Kpi
                icon={<Network size={16} />}
                value={String(fleet.affected.length)}
                label="Sites in blast-radius"
                tone="danger"
              />
            </div>
          </div>

          {/* Affected sites */}
          <div className="panel p-5">
            <PanelHeader
              title="Sites in the blast-radius"
              icon={<MapPin size={15} />}
              className="!px-0 !py-0 pb-4"
            />
            <div className="space-y-2">
              {fleet.affected.map((id) => {
                const node = nodeById[id]
                const status = node?.status ?? 'at_risk'
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-900/[0.07] bg-ink-900/[0.02] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={14} className="text-ink-500" />
                      <span className="font-mono text-[12.5px] font-medium text-ink-900">{id}</span>
                    </div>
                    <Badge tone={STATUS_TONE[status] ?? 'muted'}>{STATUS_LABEL[status] ?? status}</Badge>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cypher query */}
      <div className="panel p-5">
        <PanelHeader
          title="Blast-radius query · Cypher"
          icon={<GitBranch size={15} />}
          right={<Chip>Neo4j</Chip>}
          className="!px-0 !py-0 pb-4"
        />
        <CypherBlock />
      </div>
    </motion.div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px] text-ink-500">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
    </div>
  )
}

function CypherBlock() {
  return (
    <pre className="overflow-x-auto rounded-xl border border-ink-900/[0.07] bg-carbon-950 p-4 font-mono text-[12px] leading-relaxed">
      <code>
        <span className="text-brand-300">MATCH</span>{' '}
        <span className="text-cream-100">(s:Site)-[:USES]-&gt;(b:Batch {'{'}spec:</span>
        <span className="text-ok">&quot;non-marine&quot;</span>
        <span className="text-cream-100">{'}'})</span>
        {'\n'}
        <span className="text-brand-300">WHERE</span>{' '}
        <span className="text-cream-100">s.environment=</span>
        <span className="text-ok">&quot;coastal&quot;</span>{' '}
        <span className="text-brand-300">RETURN</span>{' '}
        <span className="text-cream-100">s.id, s.status</span>
        {'\n'}
        <span className="text-cream-300/40">
          {'// => DEL-0473(corroded), MUM-0210(corroded), GOA-0188, KOC-0231'}
        </span>
      </code>
    </pre>
  )
}
