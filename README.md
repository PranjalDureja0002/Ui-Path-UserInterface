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

## Running it — quick demo → full live stack → UiPath cloud agents

Three layers; run only as many as you need.

| Layer | What runs | Use it for |
|---|---|---|
| **A. Quick demo** | UI only (scripted) | the submission video — deterministic, no agents/cloud |
| **B. Live stack** | UI + view-backend + tunnel | streaming real agent events into the UI |
| **C. Cloud agents** | Knowledge Agent / Voice Agent on UiPath | end-to-end: a UiPath job pushes live into the UI |

### The live loop (how data reaches the UI)

```
 UiPath cloud ── Knowledge Agent ───────cloudflared──────────────┐
 (Orchestrator/                                                   ▼
  Studio Web)                                         view-backend (:8000) ──WS──▶ UI (:5173, live)
              ── Voice Agent ──▶ Twilio ──cloudflared──▶ voice webhook (:8090) ──push──┘ (local)
```

- **view-backend** (`server/view_backend.py`, `:8000`) is the bridge: agents `POST /ingest/{case_id}` a `CaseEvent`; the UI subscribes at `/ws` and renders it live.
- A **cloudflared tunnel** gives a public `https://…trycloudflare.com` URL so a **cloud** agent (or Twilio) can reach a service running on your laptop. Same-machine hops (UI↔backend, voice-webhook→backend) just use `localhost` — no tunnel needed.
- `uv` runs Python with ephemeral deps (`--with`), so nothing is added to the agent packages.

---

### A. Quick demo (UI only)

```bash
npm install
npm run dev          # → http://localhost:5173  (demo mode = scripted MC4 Scenario C)
```

Press **▶ Play** in the top bar; switch scenarios (**C · MC4 solar** / A · RF / B · cited). `.env` → `VITE_FEED_MODE=demo`.

Build scripts: `npm run build` · `npm run preview` · `npm run typecheck`.

---

### B. Live stack (UI ← view-backend ← agents)

Run each in its **own terminal** (they persist independently). PowerShell shown; for bash use `export VAR=val`.

```powershell
# 1) view-backend — the agents → UI bridge
cd server
$env:FOREMAN_INGEST_SECRET="dev-secret"
uv run --with fastapi --with "uvicorn[standard]" uvicorn view_backend:app --port 8000

# 2) UI in LIVE mode — edit .env first:
#      VITE_FEED_MODE=live
#      VITE_FEED_WS_URL=ws://localhost:8000/ws      # UI + backend on the same machine
npm run dev          # → http://localhost:5173 (empty until events arrive)

# 3) tunnel for the view-backend — ONLY needed so the CLOUD Knowledge Agent can reach it
cloudflared tunnel --url http://localhost:8000
#      → copy the https URL; the WebSocket form is  wss://<id>.trycloudflare.com/ws
```

Revert to the scripted demo any time: `.env` → `VITE_FEED_MODE=demo`, restart the UI.

---

### C-1. Knowledge Agent → UiPath cloud (Fleet/KG into the UI)

`knowledge-Agent/Solution/Agent/` runs the Neo4j blast-radius / common-cause / criticality and **pushes CaseEvents to the view-backend** as it runs.

1. **Publish** it — Studio Web auto-syncs the Local Workspace (or deploy via `uv run uipath`).
2. **Create Assets** in folder **`Shared`**:

   | Asset | Value |
   |---|---|
   | `Neo4j-Uri` / `Neo4j-User` / `Neo4j-Pass` / `Neo4j-Database` | your AuraDB creds (on 2026 Aura, user & db = the instance id) |
   | `Foreman-Backend-Url` | the **view-backend cloudflared URL** from B-3 |
   | `Foreman-Ingest-Secret` | `dev-secret` (match the backend) |

3. **Trigger** (Orchestrator job / Studio Web) with:

   ```json
   { "case_id": "CASE-PV-0758", "asset_id": "AST-PV-RJ-S12", "site_id": "RJ-SOLAR-1",
     "mode": "investigate", "failure_mode": "mc4_connector_burn" }
   ```

   `mode:"investigate"` → blast-radius (the **Fleet** tab lights up); `mode:"close"` → learns the finding back into the graph. Backend URL resolution order: **input `backend_url` → env `FOREMAN_BACKEND_URL` → Asset `Foreman-Backend-Url` → localhost** (so locally you can just pass `backend_url` in the input).

---

### C-2. Voice Agent → UiPath cloud (two-way call into the UI)

`VoiceAgent/Solutionvoice2nd/Agent/` phones the manager, runs a **natural two-way conversation** (Twilio speech, no keypad), captures approve/hold, and **pushes the live transcript to the UI**. It needs its **own webhook + tunnel** so Twilio can drive the call.

1. **Run the voice webhook** (drives the call + pushes to the **local** view-backend):

   ```powershell
   cd VoiceAgent/Solutionvoice2nd/Agent
   $env:FOREMAN_BACKEND_URL="http://localhost:8000"; $env:FOREMAN_INGEST_SECRET="dev-secret"
   uv run --with fastapi --with "uvicorn[standard]" --with httpx python voice_server.py   # :8090
   ```

2. **Tunnel the webhook** (so Twilio, in the cloud, can reach it):

   ```bash
   cloudflared tunnel --url http://localhost:8090     # → copy the https URL
   ```

3. **Create Assets** in folder **`Shared`**:

   | Asset | Value |
   |---|---|
   | `Twilio-Account-Sid` / `Twilio-Auth-Token` / `Twilio-From-Number` | your Twilio creds (`from` = a Twilio **voice** number, not the WhatsApp sandbox) |
   | `Voice-Webhook-Url` | the **voice-webhook cloudflared URL** from step 2 |

4. Trial accounts: add the destination as a **Verified Caller ID** in the Twilio console.
5. **Publish + trigger** (Studio Web) with:

   ```json
   { "to_number": "+9198XXXXXXXX", "to_role": "Site EPC manager",
     "case_id": "CASE-PV-0758", "site_id": "RJ-SOLAR-1", "title": "MC4 escalation",
     "message": "This is FOREMAN about RJ-SOLAR-1, string 12 — a melted MC4 connector, DC arc risk across six strings.",
     "recommendation": "Isolate string 12 now and dispatch a matched-brand connector swap." }
   ```

   Cloud agent places the call → Twilio drives the webhook (via tunnel) → the webhook pushes `call.line`/`call.decision` → view-backend → **Calls tab live**, and the job returns the captured `decision`. Add `"dry_run": true` to preview the script without dialing.

---

### Operational notes

- **Tunnels are ephemeral** — every `cloudflared` restart prints a **new** URL. Update the matching Asset (`Foreman-Backend-Url` / `Voice-Webhook-Url`) **and** `.env`.
- **Keep the laptop + all services running** during a live test — they're what feed the UI.
- **Secrets** (Twilio, Neo4j, OpenAI) live only in gitignored `.env` files or UiPath Assets — never in source. Rotate anything shared during setup.
- One view-backend serves both agents; the **Fleet** tab fills from the Knowledge Agent and the **Calls** tab from the Voice Agent — both as live `CaseEvent`s.

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
