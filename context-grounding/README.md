# Context Grounding — reference corpus

These are the **static reference documents** (manuals, specs, troubleshooting guides) the crew
retrieves and **cites** while reasoning — the *other* half of Context Grounding alongside the
learned [`skills/`](../skills) cards.

A skill card's `citations` point here by **`filename#anchor`**, e.g.
`imm-screw-tip-assembly#nrv` resolves to the "Non-return valve (NRV) function `[nrv]`" section of
`imm-screw-tip-assembly.pdf`. That's how FOREMAN's reasoning stays **cited and defensible** — the
citation lands on real, retrievable text.

## Demo set — PV MC4 connector burn (the live demo)
The demo skill [`SK-pv-mc4-connector-burn`](../skills/SK-pv-mc4-connector-burn.md) (field engineer
films a melted MC4 connector) cites all three:

| Document | Anchor | Backs |
|----------|--------|-------|
| `mc4-connector-install-spec.pdf` | `#crimp` | the root cause — poor crimp → high-resistance joint |
| `pv-dc-arc-safety-bulletin.pdf` | `#p1` | the safety path — self-sustaining DC arc, isolate first |
| `connector-cross-mating-warning.pdf` | `#p2` | the systemic angle — mixed-brand connectors overheat |

## Also included — IMM suck-back
The IMM skill [`SK-imm-checkring-suckback`](../skills/SK-imm-checkring-suckback.md) cites:

| Document | Anchor | Backs |
|----------|--------|-------|
| `imm-screw-tip-assembly.pdf` | `#nrv` | the cause — worn non-return valve / check ring |
| `decompression-setting-guide.pdf` | `#p2` | the first rule-out — verify the suck-back setting |
| `imm-cushion-stability.pdf` | `#p1` | the measurable sign — cushion variation > 0.5 mm |

## Production
Ingest this folder **and** `skills/` into a Context Grounding index (e.g. `foreman-knowledge`).
Each other skill card cites its own reference docs (`rf-cable-spec-NG-22`, `chiller-troubleshooting`,
`transformer-dga-guide`, …) — generate those the same way for whichever cases you demo.
