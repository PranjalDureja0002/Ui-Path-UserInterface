import { Database, FileSearch, Network, Quote } from 'lucide-react'
import { useStore } from '../../store/store'
import { AGENTS } from '../../data/catalog'
import { GROUNDING_DOCS, STORES } from '../../data/entities'
import { AgentCard } from '../../components/AgentCard'
import { Chip, Empty, Eyebrow, TabHeader } from '../../components/ui'
import { HUE_HEX } from '../../lib/hues'

export function CrewTab() {
  const c = useStore((s) => (s.activeCaseId ? s.cases[s.activeCaseId] : null))
  if (!c) return <Empty text="No active case — press play in the top bar." />

  const doneCount = AGENTS.filter((a) => c.agents[a.id].status === 'done').length
  const assembled = AGENTS.filter((a) => c.agents[a.id].status !== 'idle').length

  return (
    <div className="space-y-7">
      <TabHeader
        eyebrow="The dynamic crew"
        title="Specialists, assembled per case"
        sub="The Supervisor picks the crew and runs them in parallel — each reads its own store, then merges into one cited recommendation."
        right={
          <>
            <Chip>{assembled}/6 assembled</Chip>
            <Chip className="text-ok">{doneCount} done</Chip>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((def) => (
          <AgentCard key={def.id} def={def} run={c.agents[def.id]} />
        ))}
      </div>

      {/* The four stores */}
      <div className="pt-2">
        <Eyebrow>The four stores the agents read</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STORES.map((store) => {
            const hex = HUE_HEX[store.hue]
            const Icon =
              store.id === 'neo4j' ? Network : store.id === 'context_grounding' ? FileSearch : Database
            return (
              <div key={store.id} className="rounded-2xl border border-ink-900/[0.07] bg-paper-50 p-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: `${hex}22`, color: hex, border: `1px solid ${hex}44` }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="text-[13px] font-semibold text-ink-900">{store.name}</div>
                </div>
                <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-500">{store.holds}</p>
                <div className="mt-2.5">
                  <Chip className="text-ink-500">{store.agentsDo}</Chip>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Context Grounding citations */}
      <div className="pt-2">
        <Eyebrow>Context Grounding · retrieved & cited</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {GROUNDING_DOCS.map((d) => (
            <div
              key={d.file}
              className="flex items-start gap-3 rounded-xl border border-ink-900/[0.07] bg-paper-50 p-3"
            >
              <Quote size={14} className="mt-0.5 shrink-0 text-brand-600/70" />
              <div>
                <div className="font-mono text-[11px] font-semibold text-ink-700">{d.file}</div>
                <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">“{d.line}”</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
