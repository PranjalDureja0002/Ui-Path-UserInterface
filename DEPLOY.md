# Hosting FOREMAN (no localhost) — UI on Vercel, backend on Render

For an end-to-end run driven by **UiPath Maestro Case**, three things must be public:

| Piece | Host | Why | Cost |
|---|---|---|---|
| **Control-room UI** | **Vercel** | static React/Vite bundle, always-on | free |
| **view-backend** (`/ingest` + `/ws`) | **Render** | needs a **live process + WebSocket** — Vercel serverless can't keep a socket open | free |
| **voice webhook** (`voice_server.py`) | **Render** | Twilio must reach it during the call | free |

> **Why not the backend on Vercel?** The UI streams live events over a WebSocket (`/ws`). Vercel functions are short-lived and stateless, so a persistent socket isn't possible there. Render (or Railway / Fly.io) keeps the process running.

Deploy the **backend first** (you need its URL for the UI build).

---

## 1 · Backend → Render (free)

1. Push this repo to GitHub (already done).
2. Render → **New → Blueprint** → select this repo. It reads [`render.yaml`](render.yaml) and creates two services:
   - `foreman-view-backend`
   - `foreman-voice-webhook`
3. Set the secret env vars (dashboard → each service → Environment):

   | Service | Variable | Value |
   |---|---|---|
   | view-backend | `FOREMAN_INGEST_SECRET` | a strong secret you choose |
   | voice-webhook | `FOREMAN_INGEST_SECRET` | **same** value |
   | voice-webhook | `FOREMAN_BACKEND_URL` | the view-backend URL, e.g. `https://foreman-view-backend.onrender.com` |

4. After it builds, note the URLs:
   - view-backend: `https://foreman-view-backend.onrender.com`
     - ingest → `…/ingest/{case_id}` · WebSocket → `wss://foreman-view-backend.onrender.com/ws`
   - voice webhook: `https://foreman-voice-webhook.onrender.com`
5. Sanity check: open `https://foreman-view-backend.onrender.com/healthz` → `{"ok":true,...}`.

---

## 2 · UI → Vercel (free)

1. Vercel → **Add New → Project** → import this repo. Framework preset auto-detects **Vite** (build `npm run build`, output `dist`). The app uses **HashRouter**, so no rewrite rules are needed.
2. Add **Environment Variables** (Production):

   | Variable | Value |
   |---|---|
   | `VITE_FEED_MODE` | `live` |
   | `VITE_FEED_WS_URL` | `wss://foreman-view-backend.onrender.com/ws` |

   > Must be **`wss://`** (secure). An `https://` page cannot open an insecure `ws://` socket.
3. Deploy → you get `https://<project>.vercel.app`. To switch back to the scripted demo, set `VITE_FEED_MODE=demo` and redeploy.

---

## 3 · Point UiPath at the hosted URLs

In Orchestrator **Assets** (folder `Shared`) — replaces the old cloudflared tunnel values:

| Asset | Value |
|---|---|
| `Foreman-Backend-Url` | `https://foreman-view-backend.onrender.com` |
| `Foreman-Ingest-Secret` | the same secret as Render |
| `Voice-Webhook-Url` | `https://foreman-voice-webhook.onrender.com` |
| `Twilio-*` | your Twilio creds (unchanged) |

Now a UiPath job (Knowledge Agent / Voice Agent) pushes straight to Render → the Vercel UI renders it live. No laptop, no tunnel.

---

## Caveats (free tier)

- **Render free services sleep after ~15 min idle** and cold-start ~30–60 s. **Before a live demo, hit `/healthz` to wake the backend** and keep the UI tab open (its socket keeps it warm). For a no-sleep free option use **Fly.io** or **Railway** (same `startCommand`).
- **State is in-memory** — a backend restart clears prior cases. Fine for a live run; events flow through as they arrive.
- **Secrets** live only in the Render/Vercel dashboards — never commit them. Rotate the Twilio token / any secret shared during setup.
