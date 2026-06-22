# FOREMAN Skills — the learned-recipe library

**Your mental model is right, with one important refinement.** There are *two* kinds of
knowledge the crew reads from Context Grounding, and "skills" are only the second:

| Layer | What it is | Authored by | Example |
|------|------------|-------------|---------|
| **Reference docs** | Static manuals, specs, troubleshooting guides, SLA clauses, anti-patterns | a domain expert, once | `rf-cable-spec-NG-22.pdf`, `corrosion-troubleshooting.pdf` |
| **Skill cards** (this folder) | **Learned recipes** distilled from a *resolved + human-approved* case | the **learning loop** (thumbs-up) | `SK-coastal-rf-corrosion.json` |

So when the Vision/Root-cause agent needs to know *"what is a plug, what does corrosion look
like, how do I analyse it"* — that's the **reference docs** (plus the vision model's own
knowledge). A **skill** is the higher-value shortcut: *"I have solved this exact fingerprint
before — here is the proven recipe, cited."* It lets FOREMAN skip re-reasoning and say **"I've
seen this before (ref DEL-0473)."**

## How a skill is matched (the part that makes it safe)
Retrieval is **two steps**, not loose similarity:
1. **Semantic recall** — Context Grounding finds candidate cards by meaning.
2. **Hard gate** — the `hard_keys` of the `match_key` must match *exactly*. An IMM *auxiliary*
   fault on a 1500-tonne machine must never reuse a *screw* recipe from a 100-tonne one, even if
   the text looks similar. `soft_keys` only move confidence; they never open the gate.

If **no card passes the gate** → the crew reasons from scratch (using the reference docs +
stores) and, on the human thumbs-up at close, **writes a new candidate card**. If a card *does*
match but the world has drifted (new vendor, new spec), the human feedback **updates** it. That
is your "dynamic updation" — exactly as you described.

## Lifecycle (status + approve_count)
`candidate` (born on first thumbs-up) → reused through the hard gate → `trusted` at
`approve_count >= 3` → `retired` on a thumbs-down or when superseded.

## The card format (`SK-*.md` — frontmatter + body)

Each card is a markdown file in the **Claude/Agent `SKILL.md` style**: structured **YAML
frontmatter** (the part the system *matches on* and *mutates*) + a **markdown body** (the prose
the agents *read* and that embeds well for semantic recall in Context Grounding).

```markdown
---
id: SK-...
domain: ...                  # which vertical it serves (FOREMAN is horizontal)
title: "..."
match_key:                   # the structured fingerprint
  equipment_class: ...
  clamp_architecture: ...     # sub-class discriminator (e.g. toggle vs two_platen)
  component: ...
  failure_mode: ...
  capacity_band: [small, mid] # a BAND, not a number — defined in TAXONOMY.md
  material: ...               # domain-specific discriminator
  environment: ...
  vendor: any
hard_keys: [...]             # must match EXACTLY — the gate
soft_keys: [...]             # confidence only
asset_attributes_used: [...] # which Data Fabric asset fields feed the fingerprint
severity: P1|P2|P3
standards: ["IEC ...", "ISO ...", "OEM bulletin"]   # canonical references
status: candidate|trusted|retired
approve_count: 0
source_cases: [...]
citations: [...]
safety_protocol: false       # true => Safety agent + human gate; blocks auto-resolve
superseded_by: null
---

# Title

**Scope.** the precise equipment / sub-class / band / material it applies to.
**Canonical signs (measurable).** thresholds with units (e.g. cushion > 0.5 mm; C2H2 > 2 ppm).
**Diagnosis.** the band/architecture-specific learned cause.
**Differential.** why the band & architecture change the answer; the neighbouring cards.
**Recipe.** ordered `action(args)` steps with parameters / parts / standards.
**Risk / financial.** severity, downtime ₹/hr, safety/regulatory dimension.
**Confirm via telemetry.** the signals that corroborate it.
**Rule out.** the cheaper causes to eliminate first.
```

The **discriminators (bands, clamp architecture, voltage/material class) are defined once in
[`TAXONOMY.md`](TAXONOMY.md)** — that's the domain-expert backbone the hard gate uses, and it's
where "an 1800T two-platen ≠ a 150T toggle" is made concrete. See the four IMM cards
(`SK-imm-screw-wear`, `SK-imm-checkring-suckback`, `SK-imm-aux-hydraulic-leak`,
`SK-imm-tiebar-imbalance`) for the same symptom resolving to **different cards by band + architecture**.

**Why this format, not pure JSON:** the frontmatter keeps the hard-gate (`hard_keys`) and the
counters (`approve_count`, `status`) as discrete fields the matcher and learning loop can read
and mutate, while the markdown body is what Context Grounding actually embeds and retrieves by
meaning — far better recall than a JSON blob, and human-readable. (Not to be confused with
Anthropic **Agent Skills**, which use the same file *format* for a different purpose — packaging
instructions for a coding agent.)

## FOREMAN is horizontal — these cards span many industries
Telecom, manufacturing (injection moulding, CNC), facilities/HVAC, data centre, vertical
transport (lift/escalator), energy (solar, grid transformer), water/utilities, cold chain, and
rail — all with the **same engine**. The `equipment_class` + `component` + `capacity_band`
discriminators are what keep a recipe from one family from ever bleeding into another.

> These 18 cards are seed examples — incl. an **IMM family** (4 cards) that demonstrates
> band/architecture discrimination, and a **PV family** (`SK-pv-mc4-connector-burn` connector-level
> vs `SK-pv-combiner-arc` box-level). In production the library *grows itself* — every approved
> case adds or strengthens a card. Ingest this folder into a Context Grounding index named
> `skills`; track `status`/`approve_count` in the Data Fabric `Skill` entity.
