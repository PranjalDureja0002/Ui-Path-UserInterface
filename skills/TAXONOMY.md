# FOREMAN discriminator taxonomy — the canonical bands the hard gate uses

A skill only fires when its `hard_keys` match **exactly**. For continuous quantities (tonnage,
voltage, vibration) "exactly" means **the same band**, and bands are defined here, per equipment
family, by a domain expert — which is what makes FOREMAN adaptable per client without retraining.
The match fingerprint is assembled from the **asset master record (Data Fabric)** + perception,
not from the video alone, so the right discriminators are always known.

> This file is the reference the cards point to. Extend it as you add verticals.

## Injection Moulding Machine (IMM)

**Clamp force (tonnage) bands**
| Band | Clamp force | Typical role |
|------|-------------|--------------|
| `micro` | < 50 T | micro / LSR parts |
| `small` | 50–250 T | small precision parts (usually toggle) |
| `mid` | 250–650 T | general moulding (toggle or hydraulic) |
| `large` | 650–1800 T | large parts; **often two-platen hydraulic** |
| `mega` | > 1800 T | automotive bumpers, crates (**two-platen**, to 5500T+) |

**Clamp architecture (`clamp_architecture`) — a hard discriminator**
| Value | What it is | Characteristic failure modes |
|-------|-----------|------------------------------|
| `toggle` | mechanical toggle linkage, ≤ ~1300 T | toggle-pin/bushing wear, lube starvation, platen parallelism drift |
| `two_platen` | hydraulic split-nut lock on tie-bars, short-stroke cylinders (large/mega) | **tie-bar strain imbalance, half-nut/locking-nut wear, corner-tonnage imbalance, clamp-cylinder seal** |
| `three_platen` | full-stroke hydraulic clamp behind moving platen (older large) | clamp-cylinder seal, large platen wear |

**Why it matters:** "flashing" or "won't build tonnage" on a 150T `toggle` machine → toggle-pin
wear or mould-height set. The *same* complaint on an 1800T `two_platen` machine → tie-bar strain
imbalance or half-nut wear across the four corners. **Different component, different recipe,
different cost** — so they must be separate cards, gated on `capacity_band` + `clamp_architecture`.

**Material class (`material`)** — `commodity` (PP/PE/PS) · `engineering` (PA/PC/POM) ·
`abrasive` (glass/mineral-filled) · `corrosive` (PVC/flame-retardant). Drives screw/barrel metallurgy.

**Cushion (process)** — residual melt at end of injection, nominal 3–10 mm. Shot-to-shot
variation **> 0.5 mm** or a falling cushion ⇒ non-return-valve (check-ring) leakage.

## Rotating machinery — vibration (CNC spindle, pumps, motors)
ISO 20816 / ISO 10816 velocity zones: **A** new · **B** acceptable · **C** alarm (plan action) ·
**D** trip (damage likely). FOREMAN raises at entry to **C**, blocks run at **D**.

## Power transformers — DGA & bushings
Dissolved-gas analysis per **IEEE C57.104 / IEC 60599**; fault typing via the **Duval triangle**.
Indicative limits: **C₂H₂ (acetylene) > 2 ppm** ⇒ arcing; **H₂ + CH₄ rising with low C₂H₂** ⇒
partial discharge; sustained thermal gases ⇒ overheating. Bushings: **IEEE C57.19.01** — rising
**tan-δ (power factor)** or **±5% capacitance** change ⇒ insulation degradation.

## Severity & safety mapping (used by every card)
`severity`: **P1** (live risk / large SLA exposure / safety) · **P2** (degraded, schedule) ·
**P3** (monitor). `safety_protocol: true` routes through the **Safety & Compliance** agent
(lockout/permit/out-of-service) and **blocks auto-resolution** — the human gate is mandatory.
