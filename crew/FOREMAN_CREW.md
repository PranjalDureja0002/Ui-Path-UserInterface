# FOREMAN — the crew model (the brain + 10 realistic specialists)

```
Vision (perceives the media)  ──►  Supervisor (orchestrates)
                                      │
              ┌───────────────────────┴───────────────────────┐
              │  ALWAYS — Diagnosis & Recommendation Engine    │   the brain: Skills + reference PDFs
              │  (skill match · cite docs · Data Fabric ·      │   + Data Fabric + Memory + Neo4j
              │   Memory · root cause · cited fix)             │
              └───────────────────────┬───────────────────────┘
                                      │  Supervisor adds ONLY the specialists the findings call for
                                      │  — and can justify every one it SKIPS
                          ┌───────────┴───────────┐
                          │   10 dynamic specialists  │
                          └───────────────────────────┘
```

## The always-on brain — Diagnosis & Recommendation Engine
Runs on **every** case, every domain. **This is where FOREMAN's whole solution ties together** —
Skills, the Context-Grounding reference PDFs, Data Fabric and Agent Memory. It matches a learned
**Skill** (hard gate), **cites** the reference docs, reads the **asset master record**, recalls
**Memory**, reasons to a **root cause**, and emits the **cited fix** (and writes the Skill on close).
It is never optional — skill use, Data Fabric and cited reasoning *are* the product.

## The 10 dynamic specialists
The Supervisor pulls in only the ones a real ops desk would. Each is **horizontal** — same agent,
any asset class.

| # | Specialist | Answers | Pulled in when |
|---|-----------|---------|----------------|
| 1 | **Fleet & Blast-Radius** | Is this systemic? what else fails? | shares batch / vendor / firmware / feeder / install-crew |
| 2 | **Warranty & Entitlement** | Who pays? is it claimable? | warranty open **and** a vendor/spec defect (not workmanship) |
| 3 | **SLA & Commercial Impact** | What does downtime cost / who's hit? | serves multi-tenant / SLA **and** the cost could change the action |
| 4 | **Safety & Compliance** | Does it trip a safety/regulatory protocol? | hazardous equipment/skill — **can BLOCK auto-resolve** |
| 5 | **Parts & Logistics** | Spare in stock? lead time? | the fix needs a part |
| 6 | **Field Dispatch** | Who (certified) goes, and when? | a physical repair / inspection visit |
| 7 | **Telemetry & Predictive** | Does sensor history corroborate / RUL? | the fault is **incipient** (a trend to read) |
| 8 | **Vendor & Supply-Chain** | Known defect / recall / RMA? | the root cause implicates a **supplier** / batch / recall |
| 9 | **Site Access & Weather** | Is it safe/possible to work now? | outdoor / height / live-environment / weather-sensitive |
| 10 | **Cost Optimization** | Repair vs replace vs upgrade? | a **genuine** repair-vs-replace trade-off exists |

## The MC4 demo — who's invoked, and the strong case for who isn't
**Scenario:** a field engineer films a melted MC4 connector with frayed copper at the crimp.

The brain always runs (matches `SK-pv-mc4-connector-burn`, cites the three reference PDFs, RCA =
high-resistance joint from a poor crimp → DC arc). The Supervisor then runs **5 of the 10**:

| ✅ Invoked | Why |
|-----------|-----|
| **Safety & Compliance** | DC arc + fire is safety-critical (NEC 690.11). Isolate under no-load + LOTO; **blocks auto-resolve** — the human gate is mandatory. The non-negotiable one. |
| **Fleet & Blast-Radius** | a poor-crimp / cross-mating cause is a **systemic install defect**, not a one-off — audit the installer's other strings. One finding can mean dozens of latent fire risks. |
| **Parts & Logistics** | the fix needs a **matched genuine MC4 pair + the correct crimp die** — confirm stock/lead time before a truck rolls. |
| **Field Dispatch** | physical re-termination by a **certified PV technician** — DC arc work is not for any hand. |
| **Site Access & Weather** | outdoor DC electrical work needs a **dry weather window + daylight** — schedule into a safe window, not into rain. |

And — the part judges remember — it **deliberately skips the other 5, with a reason for each:**

| ⛔ Not invoked | Why not (the strong argument) |
|---------------|-------------------------------|
| **Warranty & Entitlement** | the **visible frayed copper at the crimp is a field workmanship defect**, not a vendor spec/manufacturing defect — there is **no claimable warranty path**. Opening a claim would be wrong. *(Contrast the RF case: a non-marine **spec** defect WAS claimable.)* |
| **Vendor & Supply-Chain** | **no confirmed supplier defect or recall** — workmanship is the lead cause. **Held** for re-engagement *only if* the Fleet audit proves systemic cross-mating (a procurement substitution). Don't escalate a supplier over a crew's bad crimp. |
| **SLA & Commercial Impact** | a single PV string is a **small, bounded** generation loss — and the action is **already mandated by safety**. A rupee figure **can't change a fire-risk decision**, so don't compute one. *(Contrast the RF tower: multi-tenant ~₹48k/hr DID drive the action.)* |
| **Telemetry & Predictive** | the connector has **already hard-failed** (melted, live now). Nothing **incipient** to trend or predict, and the string-current signal is already lost. The decision is immediate — a trend would only add latency. |
| **Cost Optimization** | **no repair-vs-replace trade-off** — a charred connector is *always* cut out and replaced; you never "repair" a fire risk or run it to failure. Safety-optimal = cost-optimal, so there's nothing to optimise. |

**The pattern of the "why nots":** each skip is tied to a *specific fact of this fault* — it's
**workmanship not a spec defect** (kills Warranty + Vendor), it's **already failed not incipient**
(kills Telemetry), it's a **single string and safety-forced** (kills SLA + Cost-opt). That's a
Supervisor reasoning about **relevance**, not a checklist running blind — the strongest possible
answer to *"does it just call everything?"*

## Other worked crews (same brain, different team)
- **Coastal RF corrosion:** Brain + Warranty & Entitlement (non-marine **spec** defect → claim) +
  Fleet & Blast-Radius (failing batch) + SLA & Commercial Impact (multi-tenant ₹48k/hr).
- **IMM suck-back (NRV):** Brain + Parts & Logistics (NRV kit) + Telemetry & Predictive (cushion
  SPC trend — here it IS incipient) + Field Dispatch + Cost Optimization (re-terminate vs replace
  the whole screw-tip assembly is a real trade-off).

See `crew-registry.json` for the machine form, incl. the `mc4_demo_invocation` block.
