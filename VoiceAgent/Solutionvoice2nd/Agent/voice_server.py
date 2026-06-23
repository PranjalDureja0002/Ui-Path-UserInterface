"""FOREMAN voice webhook — a NATURAL two-way escalation call + live UI push.

Twilio fetches TwiML from here while the call is live. The manager simply SPEAKS
(no keypad) — FOREMAN states the case, the manager replies, FOREMAN gives the
recommendation, the manager approves or holds. Every turn is:
  • captured (transcript + decision the agent polls back), and
  • pushed to the FOREMAN view-backend so the UI's Calls tab shows it live.

Run (ephemeral deps via uv):
    FOREMAN_BACKEND_URL=http://localhost:8000 FOREMAN_INGEST_SECRET=dev-secret \
      uv run --with fastapi --with "uvicorn[standard]" --with httpx python voice_server.py
    cloudflared tunnel --url http://localhost:8090     # public URL for Twilio
"""
import os
import time
from xml.sax.saxutils import escape

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

VOICE = os.environ.get("TWIML_VOICE", "Polly.Joanna")
LANG = os.environ.get("TWIML_LANG", "en-US")
PORT = int(os.environ.get("VOICE_PORT", "8090"))
BACKEND = os.environ.get("FOREMAN_BACKEND_URL", "").rstrip("/")
SECRET = os.environ.get("FOREMAN_INGEST_SECRET", "dev-secret")

app = FastAPI(title="FOREMAN Voice Webhook")

CALLS: dict[str, dict] = {}  # token -> script + state + decision + transcript

APPROVE = ("approve", "approved", "go ahead", "yes", "authorise", "authorize", "do it", "isolate", "proceed", "agree", "sounds good", "okay do")
HOLD = ("hold", "don't", "do not", "wait", "stop", "no ", "not now", "later", "deny", "stand down")


def _say(text: str) -> str:
    return f'<Say voice="{escape(VOICE)}" language="{escape(LANG)}">{escape(text)}</Say>'


def _gather(action: str, prompt_twiml: str = "") -> str:
    return (
        f'<Gather input="speech" speechTimeout="auto" speechModel="phone_call" '
        f'language="{escape(LANG)}" timeout="7" action="{action}" method="POST">'
        f"{prompt_twiml}</Gather>"
    )


async def push(case_id: str, event: dict) -> None:
    """Best-effort push of a CaseEvent into the view-backend (→ live UI)."""
    if not BACKEND or not case_id:
        return
    try:
        async with httpx.AsyncClient(timeout=5) as hc:
            await hc.post(f"{BACKEND}/ingest/{case_id}", json=event, headers={"x-foreman-secret": SECRET})
    except Exception:  # noqa: BLE001
        pass


@app.get("/health")
def health() -> dict:
    return {"ok": True, "backend": BACKEND or "(none)", "calls": len(CALLS)}


@app.post("/prepare")
async def prepare(req: Request) -> dict:
    b = await req.json()
    token = b.get("token") or ""
    CALLS[token] = {
        "message": b.get("message") or "",
        "recommendation": b.get("recommendation") or "",
        "case_id": b.get("case_id") or f"CALL-{token[:8]}",
        "to_role": b.get("to_role") or "the manager",
        "site_id": b.get("site_id") or "",
        "title": b.get("title") or "Voice escalation",
        "to_number": b.get("to_number") or "",
        "opened": False,
        "status": "calling",
        "decision": "",
        "transcript": [],
    }
    return {"ok": True}


def _line(c: dict, speaker: str, text: str) -> dict:
    c["transcript"].append({"speaker": speaker, "text": text})
    return {"kind": "call.line", "line": {"speaker": speaker, "text": text}}


@app.api_route("/voice", methods=["GET", "POST"])
async def voice(token: str = "") -> PlainTextResponse:
    c = CALLS.get(token)
    if not c:
        return PlainTextResponse(f"<Response>{_say('Call context expired. Goodbye.')}</Response>", media_type="application/xml")
    c["status"] = "connected"

    if not c["opened"]:
        c["opened"] = True
        cid = c["case_id"]
        await push(cid, {"kind": "case.opened", "case": {
            "case_id": cid, "site_id": c["site_id"], "title": c["title"],
            "worker_name": c["to_role"], "stage": "escalate", "status": "open",
            "scenario": "C", "opened_at": time.strftime("%H:%M"), "risk_score": 0.88,
        }})
        await push(cid, {"kind": "stage.entered", "stage": "escalate"})
        await push(cid, {"kind": "call.started", "to": c["to_number"], "toRole": c["to_role"]})
        await push(cid, {"kind": "call.connected"})
        await push(cid, _line(c, "foreman", c["message"]))

    twiml = (
        "<Response>"
        + _say(c["message"])
        + '<Pause length="1"/>'
        + _gather(f"/respond?token={escape(token)}")
        + f'<Redirect method="POST">/respond?token={escape(token)}&amp;silent=1</Redirect>'
        + "</Response>"
    )
    return PlainTextResponse(twiml, media_type="application/xml")


@app.post("/respond")
async def respond(request: Request, token: str = "", silent: str = "") -> PlainTextResponse:
    c = CALLS.get(token)
    if not c:
        return PlainTextResponse(f"<Response>{_say('Goodbye.')}</Response>", media_type="application/xml")
    form = await request.form()
    speech = (form.get("SpeechResult") or "").strip()
    if speech:
        await push(c["case_id"], _line(c, "manager", speech))

    rec = c["recommendation"] or "I recommend we proceed with the fix now and log the action."
    await push(c["case_id"], _line(c, "foreman", rec))

    twiml = (
        "<Response>"
        + _say(rec)
        + '<Pause length="1"/>'
        + _gather(f"/decide?token={escape(token)}", _say("Do you approve?"))
        + f'<Redirect method="POST">/decide?token={escape(token)}&amp;silent=1</Redirect>'
        + "</Response>"
    )
    return PlainTextResponse(twiml, media_type="application/xml")


@app.post("/decide")
async def decide(request: Request, token: str = "", silent: str = "") -> PlainTextResponse:
    c = CALLS.get(token)
    if not c:
        return PlainTextResponse(f"<Response>{_say('Goodbye.')}</Response>", media_type="application/xml")
    form = await request.form()
    speech = (form.get("SpeechResult") or "").strip()
    low = speech.lower()

    if any(w in low for w in HOLD):
        decision = "hold"
    elif any(w in low for w in APPROVE):
        decision = "approved"
    else:
        decision = "hold"  # ambiguous / silent → never auto-authorise

    c["decision"] = decision
    c["status"] = "decided"
    if speech:
        await push(c["case_id"], _line(c, "manager", speech))

    actions = ["isolate_string", "crew_audit"] if decision == "approved" else []
    await push(c["case_id"], {"kind": "call.decision", "decision": {
        "authorized": decision == "approved", "actions": actions,
        "by": c["to_role"], "at": time.strftime("%H:%M"),
    }})

    if decision == "approved":
        body = _say("Thank you. Logged as authorised. We are proceeding now. Goodbye.")
    else:
        body = _say("Understood. We will hold and await your go-ahead. Goodbye.")
    return PlainTextResponse(f"<Response>{body}</Response>", media_type="application/xml")


@app.get("/decision")
def decision(token: str = "") -> dict:
    c = CALLS.get(token, {})
    return {"status": c.get("status", "unknown"), "decision": c.get("decision", ""), "transcript": c.get("transcript", [])}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
