"""
FOREMAN view-backend — the tiny bridge between your UiPath agents and the UI.

It does two things:
  1. POST /ingest/{case_id}   ← your coded agent pushes CaseEvents here as it runs
  2. WS   /ws                 → the React UI subscribes; events are fanned out live

Run:
    pip install -r requirements.txt
    FOREMAN_INGEST_SECRET=dev-secret uvicorn view_backend:app --port 8000

Then point the UI at it:  .env →  VITE_FEED_MODE=live  VITE_FEED_WS_URL=ws://localhost:8000/ws
For a public endpoint (so Orchestrator webhooks / a cloud agent can reach it):
    cloudflared tunnel --url http://localhost:8000     (or ngrok http 8000)
"""
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

SECRET = os.environ.get("FOREMAN_INGEST_SECRET", "dev-secret")

app = FastAPI(title="FOREMAN view-backend")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# In-memory truth: per-case ordered event log (the "snapshot" for late clients).
# Swap for Redis if you want multiple backend instances.
CASES: dict[str, list[dict]] = {}
CLIENTS: set[WebSocket] = set()


async def broadcast(msg: dict) -> None:
    dead = []
    for ws in CLIENTS:
        try:
            await ws.send_text(json.dumps(msg))
        except Exception:
            dead.append(ws)
    for ws in dead:
        CLIENTS.discard(ws)


@app.post("/ingest/{case_id}")
async def ingest(case_id: str, event: dict, x_foreman_secret: str = Header(default="")):
    """Your agent calls this for every CaseEvent. `event` must match the UI's
    CaseEvent union (kind + payload) — see src/types.ts."""
    if x_foreman_secret != SECRET:
        raise HTTPException(status_code=401, detail="bad secret")
    CASES.setdefault(case_id, []).append(event)
    await broadcast({"case_id": case_id, "event": event})
    return {"ok": True, "count": len(CASES[case_id])}


@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    CLIENTS.add(websocket)
    # Replay current truth so a freshly-connected browser catches up instantly.
    for case_id, events in CASES.items():
        await websocket.send_text(
            json.dumps({"type": "snapshot", "case_id": case_id, "events": events})
        )
    try:
        while True:
            await websocket.receive_text()  # keepalive pings; nothing to read
    except WebSocketDisconnect:
        CLIENTS.discard(websocket)


@app.get("/healthz")
def health():
    return {"ok": True, "cases": list(CASES.keys()), "clients": len(CLIENTS)}
