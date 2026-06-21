# FOREMAN — Field Operations Control Room (UI)

The autonomous field-operations colleague — *from a WhatsApp message to a documented, defensible resolution.*

This repository is the **control-room UI** for FOREMAN, built for **UiPath AgentHack 2026 · Track 1 (Maestro Case)**. It is a TwelveLabs-inspired React + Tailwind front end that makes the invisible agentic work visible: a cinematic landing page plus a 7-tab live dashboard that animates a full case from intake to a learned skill.

> Built with **Claude Code**.

---

## What it shows

A complete, real-time run of the canonical telecom-tower scenario:

- **Case A · DEL-0473** — a coastal RF-jumper corrosion + diesel-generator knock. No skill exists yet, so the crew reasons *from scratch*: Vision (Gemini) perception → human confirm → a parallel specialist crew → a high risk score → a real escalation **voice call** → guarded BPMN writes (ServiceNow ticket, work order, warranty claim) → an audit pack → and, on the thumbs-up, a **new candidate skill**.
- **Case B · MUM-0210** — ten days later, a similar coastal site. FOREMAN matches the learned skill through the **hard gate**, proposes the cited fix *immediately*, auto-resolves (risk below the call threshold), and the skill is promoted to **trusted**.

The contrast — slow-and-from-scratch vs. fast-and-cited — is the moment the demo lands.

## The seven tabs

| Tab | What it shows |
|---|---|
| **Cases** | the triage queue of every opened case |
| **Console** | mission control — stage rail, risk meter, WhatsApp thread, crew status, the merged recommendation, live activity feed |
| **Crew** | the six specialist agents (status, findings, citations) + the four stores they read |
| **Calls** | the Twilio voice escalation — live transcript + captured decision |
| **Skills** | the learning loop — candidate → trusted skill cards + the smart-matching fingerprint |
| **Fleet** | the Neo4j blast-radius graph + the money story |
| **Audit** | the closure pack — audit email, produced artifacts, the human feedback gate |

## How the data flows (and how it maps to live UiPath)

Everything is driven by a **normalized case-event model** (`src/types.ts → CaseEvent`). A replay engine (`src/store/`) emits scripted events from a timeline (`src/data/scenarioA.ts`, `scenarioB.ts`) into a Zustand store; each event mutates the case state; the tabs render slices of it.

**This is the same shape the live view-backend will push over WebSocket.** When wired to a running Maestro case, the feed becomes: *Orchestrator webhooks (job/task events) + Maestro instance polling + your Neo4j* → a small view-backend that normalizes into `CaseEvent` → WebSocket → this exact UI. Swapping replay → live is a drop-in at `src/store/feed`.

The built-in **replay controls** (play / pause / restart / skip / 1×·2×·4× / Case A↔B) also make the 5-minute submission video bulletproof — it plays a deterministic scripted run even if a live service hiccups.

## Run it

```bash
npm install
npm run dev      # → http://localhost:5173
```

Press **▶ Play** in the top bar to run Case A. Switch to **Case B** to see the learned, cited fast-path. Other scripts:

```bash
npm run build     # production build (tsc + vite)
npm run preview   # preview the production build
npm run typecheck # type-only check
```

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Framer Motion · React Router · lucide-react.

Design language: TwelveLabs-inspired — warm near-black control-room surfaces, cream sections, soft pastel gradients, Manrope/Inter/JetBrains Mono, elegant pill chips.

## Project layout

```
src/
  types.ts              domain + normalized CaseEvent model
  data/                 agent catalogue, Data Fabric seed, the two scenario timelines, fleet graph
  store/                Zustand store, event reducer, replay engine (the live-feed seam)
  components/           reusable: AgentCard, WhatsAppThread, FleetGraph, RiskMeter, StageRail, ...
  pages/Home.tsx        the TwelveLabs-style landing page
  app/                  Dashboard shell + the 7 tabs
  assets/               the 3 architecture/flow images
```

## Hosting

The UI may run **anywhere** (local for the demo, Vercel/Netlify, or as a UiPath Coded App) — AgentHack only requires the *orchestration* (the Maestro Case, agents, Action Center gates, BPMN) to run on UiPath Automation Cloud, which it does. `vite.config.ts` sets `base: './'` so the bundle also drops cleanly into a UiPath Coded App (`ORG.uipath.host/<app>`) if you choose that path.
