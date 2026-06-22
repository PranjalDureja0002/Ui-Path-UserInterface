import { motion } from 'framer-motion'
import {
  Crosshair,
  Database,
  GitBranch,
  MapPin,
  Network,
  ShieldAlert,
  TrendingDown,
  Workflow,
} from 'lucide-react'
import { useStore } from '../../store/store'
import { FleetGraph } from '../../components/FleetGraph'
import { Badge, Chip, Empty, Kpi, PanelHeader, TabHeader } from '../../components/ui'
import { inrCompact } from '../../lib/format'
import type { Tone } from '../../lib/hues'
import type { CaseView, FleetFactor, FleetNode } from '../../types'

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
  const unit = fleet.unitNoun ?? 'site'
  const nodeById = Object.fromEntries(fleet.nodes.map((n) => [n.id, n])) as Record<string, FleetNode>

  // which hub(s) each affected asset propagates through (for the "via" column)
  const viaByAsset = new Map<string, string[]>()
  fleet.edges
    .filter((e) => e.hot)
    .forEach((e) => {
      const arr = viaByAsset.get(e.from) ?? []
      const hub = nodeById[e.to]
      if (hub) arr.push(hub.label)
      viaByAsset.set(e.from, arr)
    })

  const exposure = fleet.exposurePerHr ?? c.investigation?.exposure_per_hr
  const rootTop = fleet.rootCause?.[0]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <TabHeader
        eyebrow="Fleet · Neo4j blast-radius"
        title="One fault, the whole fleet"
        sub="The connection graph finds every unit at risk — and the shared root a flat query can't see."
        right={
          fleet.systemic ? (
            <Badge tone="danger">
              <Network size={11} /> systemic · {fleet.affected.length} {unit}s
            </Badge>
          ) : undefined
        }
      />

      {/* ── The punch: same data, SQL vs graph ─────────────────────────────── */}
      {fleet.sqlVsGraph && <SqlVsGraph data={fleet.sqlVsGraph} unit={unit} />}

      {/* ── Graph (left) + intelligence (right) ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="panel p-5">
            <PanelHeader
              title="Multi-factor blast-radius"
              icon={<Network size={15} />}
              right={<Chip>{fleet.nodes.length} nodes · {fleet.edges.length} edges</Chip>}
              className="!px-0 !py-0 pb-4"
            />
            <FleetGraph nodes={fleet.nodes} edges={fleet.edges} />
            <NodeLegend nodes={fleet.nodes} />
          </div>
        </div>

        <div className="space-y-5 lg:col-span-5">
          {fleet.rootCause && fleet.rootCause.length > 0 && <CommonCause factors={fleet.rootCause} />}
          {fleet.criticality && fleet.criticality.length > 0 && (
            <Criticality factors={fleet.criticality} />
          )}
          {!fleet.rootCause && !fleet.criticality && <AffectedList c={c} viaByAsset={viaByAsset} />}
        </div>
      </div>

      {/* ── Impact KPIs (data-driven) ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          icon={<Crosshair size={16} />}
          value={String(fleet.affected.length)}
          label={`${unit}s in blast-radius`}
          tone="danger"
        />
        {rootTop && (
          <Kpi
            icon={<Workflow size={16} />}
            value={rootTop.factor}
            label={`common-cause root · ${rootTop.factorType.toLowerCase()}`}
            tone="danger"
          />
        )}
        {fleet.sqlVsGraph && (
          <Kpi
            icon={<Database size={16} />}
            value={`${fleet.sqlVsGraph.sqlFound} → ${fleet.sqlVsGraph.graphFound}`}
            label="flat query → graph"
            tone="info"
          />
        )}
        {exposure != null && (
          <Kpi
            icon={<TrendingDown size={16} />}
            value={inrCompact(exposure) + '/hr'}
            label={fleet.exposureLabel ?? 'Exposure avoided'}
            tone="warn"
          />
        )}
      </div>

      {/* ── Affected units (with the link they share) + the Cypher ─────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {(fleet.rootCause || fleet.criticality) && (
          <div className="lg:col-span-5">
            <AffectedList c={c} viaByAsset={viaByAsset} />
          </div>
        )}
        {fleet.query && (
          <div className={fleet.rootCause || fleet.criticality ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <div className="panel p-5">
              <PanelHeader
                title={fleet.queryTitle ?? 'Blast-radius query · Cypher'}
                icon={<GitBranch size={15} />}
                right={<Chip>Neo4j</Chip>}
                className="!px-0 !py-0 pb-4"
              />
              <QueryBlock query={fleet.query} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── The headline contrast — what SQL returns vs what the graph returns ───────
function SqlVsGraph({
  data,
  unit,
}: {
  data: NonNullable<CaseView['fleet']>['sqlVsGraph']
  unit: string
}) {
  if (!data) return null
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-ink-900/[0.08] bg-ink-900/[0.02] p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          <Database size={13} /> A flat “same-batch” query
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-[34px] font-bold leading-none text-ink-400">
            {data.sqlFound}
          </span>
          <span className="text-[12.5px] text-ink-500">real {unit}s found</span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-500">{data.sqlNote}</p>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-danger/25 bg-danger/[0.05] p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-danger">
          <Network size={13} /> FOREMAN’s knowledge graph
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-[34px] font-bold leading-none text-danger">
            {data.graphFound}
          </span>
          <span className="text-[12.5px] text-ink-600">{unit}s at risk found</span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-600">{data.graphNote}</p>
      </div>
    </div>
  )
}

// ── Common-cause: the shared upstream root, ranked by failures explained ─────
function CommonCause({ factors }: { factors: FleetFactor[] }) {
  return (
    <div className="panel p-5">
      <PanelHeader
        title="Common-cause root"
        icon={<Workflow size={15} />}
        right={<Chip>not a column SQL has</Chip>}
        className="!px-0 !py-0 pb-4"
      />
      <div className="space-y-2.5">
        {factors.map((f) => (
          <div
            key={f.factor}
            className="rounded-xl border border-danger/20 bg-danger/[0.04] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-semibold text-ink-900">{f.factor}</span>
                <Chip className="!text-[9.5px]">{f.factorType}</Chip>
              </div>
              <Badge tone="danger">explains {f.count}</Badge>
            </div>
            {f.note && <div className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">{f.note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Criticality: degree centrality — the single-points-of-failure to harden ──
function Criticality({ factors }: { factors: FleetFactor[] }) {
  const max = Math.max(...factors.map((f) => f.count), 1)
  return (
    <div className="panel p-5">
      <PanelHeader
        title="Criticality ranking"
        icon={<ShieldAlert size={15} />}
        right={<Chip>harden first</Chip>}
        className="!px-0 !py-0 pb-4"
      />
      <div className="space-y-3">
        {factors.map((f, i) => {
          const tone = i === 0 ? '#e23b3b' : i === 1 ? '#c77b08' : '#5b6573'
          return (
            <div key={f.factor}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-mono font-semibold text-ink-800">{f.factor}</span>
                <span className="text-ink-500">
                  {f.count} <span className="text-ink-400">exposed</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-900/[0.05]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(f.count / max) * 100}%`, background: tone, boxShadow: `0 0 10px ${tone}66` }}
                />
              </div>
              {f.note && <div className="mt-1 text-[10.5px] text-ink-400">{f.note}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AffectedList({
  c,
  viaByAsset,
}: {
  c: CaseView
  viaByAsset: Map<string, string[]>
}) {
  const fleet = c.fleet!
  const nodeById = Object.fromEntries(fleet.nodes.map((n) => [n.id, n])) as Record<string, FleetNode>
  return (
    <div className="panel p-5">
      <PanelHeader
        title={`${fleet.unitNoun ?? 'Unit'}s in the blast-radius`}
        icon={<MapPin size={15} />}
        className="!px-0 !py-0 pb-4"
      />
      <div className="space-y-2">
        {fleet.affected.map((id) => {
          const node = nodeById[id]
          const status = node?.status ?? 'at_risk'
          const via = viaByAsset.get(id)
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-900/[0.07] bg-ink-900/[0.02] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="shrink-0 text-ink-500" />
                  <span className="font-mono text-[12.5px] font-medium text-ink-900">
                    {node?.label ?? id}
                  </span>
                </div>
                {via && via.length > 0 && (
                  <div className="mt-0.5 pl-[21px] text-[10.5px] text-ink-400">
                    via {via.join(' + ')}
                  </div>
                )}
              </div>
              <Badge tone={STATUS_TONE[status] ?? 'muted'}>{STATUS_LABEL[status] ?? status}</Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TYPE_NAME: Record<string, string> = {
  crew: 'install crew',
  part_lot: 'part lot',
  asset: 'asset',
  batch: 'batch',
  site: 'site',
  vendor: 'vendor',
  cluster: 'cluster',
}

function NodeLegend({ nodes }: { nodes: FleetNode[] }) {
  const types = Array.from(new Set(nodes.map((n) => n.type)))
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-900/[0.07] pt-4">
      <LegendDot color="#e23b3b" label="failing" />
      <LegendDot color="#c77b08" label="at-risk" />
      <LegendDot color="#1aa251" label="healthy" />
      <span className="text-ink-300">·</span>
      <span className="text-[11px] text-ink-400">
        nodes: {types.map((t) => TYPE_NAME[t] ?? t).join(' · ')}
      </span>
      <span className="ml-auto text-[10.5px] text-ink-300">hover a node to trace its links</span>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px] text-ink-500">
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </div>
  )
}

function QueryBlock({ query }: { query: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-ink-900/[0.07] bg-carbon-950 p-4 font-mono text-[12px] leading-relaxed">
      <code>
        {query.split('\n').map((line, i) => {
          const comment = line.trimStart().startsWith('//')
          return (
            <div key={i} className={comment ? 'text-cream-300/40' : 'text-cream-100'}>
              {line || ' '}
            </div>
          )
        })}
      </code>
    </pre>
  )
}
