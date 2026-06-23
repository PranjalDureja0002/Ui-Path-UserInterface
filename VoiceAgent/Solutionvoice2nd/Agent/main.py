"""FOREMAN — Voice escalation agent (Twilio outbound call).

At the Escalate stage, FOREMAN phones the manager and runs the escalation as a
TWO-WAY conversation: it states the case, asks for a decision, and the manager
answers by KEYPAD (1 = approve, 2 = hold) or by SPEAKING ("approve" / "hold").
The agent returns the captured `decision`.

Two modes:
  • TWO-WAY (recommended) — set a public `webhook_url` (the voice_server.py exposed
    via cloudflared). The call is driven by that webhook; the manager's decision is
    captured and polled back here.
  • ONE-WAY (fallback)   — no webhook: FOREMAN just speaks `message` and hangs up.

Trigger from UiPath with:
    { "to_number": "+91XXXXXXXXXX", "message": "...", "recommendation": "..." }

Credentials resolve env-first (local .env) then UiPath Assets (folder Shared):
    TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER / VOICE_WEBHOOK_URL
      or  Assets  Twilio-Account-Sid / Twilio-Auth-Token / Twilio-From-Number / Voice-Webhook-Url

NOTE: from_number must be a Twilio VOICE number (NOT the WhatsApp sandbox). On a
trial account you may only call VERIFIED numbers.
"""
import asyncio
import os
import time
import uuid
from xml.sax.saxutils import escape

# Corporate TLS-inspecting proxies (e.g. PwC) re-sign certs — trust the OS store so
# Twilio's HTTPS API doesn't fail with CERTIFICATE_VERIFY_FAILED.
try:
    import truststore

    truststore.inject_into_ssl()
except Exception:  # noqa: BLE001
    pass

import httpx
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field


class Input(BaseModel):
    to_number: str = Field(description="Number to call, E.164, e.g. +919805022411 (verified on trial)")
    message: str = Field(description="What FOREMAN says first — the escalation summary.")
    recommendation: str = Field(default="", description="The fix FOREMAN proposes; spoken as the recommendation.")
    to_role: str = Field(default="the manager", description="Who is being called, e.g. 'Site EPC manager'.")
    site_id: str = Field(default="", description="Site id for the UI case, e.g. RJ-SOLAR-1.")
    title: str = Field(default="Voice escalation", description="Case title shown in the UI Calls tab.")
    from_number: str = Field(default="", description="Twilio VOICE number to call FROM (overrides env/Asset).")
    webhook_url: str = Field(default="", description="Public voice webhook (two-way). Else env VOICE_WEBHOOK_URL / Asset Voice-Webhook-Url. Empty = one-way.")
    wait_for_decision: bool = Field(default=True, description="Two-way: block until the manager decides (or timeout).")
    timeout_sec: int = Field(default=75, description="Two-way: how long to wait for the decision.")
    voice: str = Field(default="alice", description="Twilio TTS voice (one-way only; webhook has its own).")
    language: str = Field(default="en-IN", description="Speech language, e.g. en-IN / en-US.")
    case_id: str = Field(default="", description="Case id, for logging, e.g. CASE-PV-0758.")
    dry_run: bool = Field(default=False, description="Build everything but place NO real call.")


class State(BaseModel):
    to_number: str = ""
    message: str = ""
    recommendation: str = ""
    to_role: str = "the manager"
    site_id: str = ""
    title: str = "Voice escalation"
    from_number: str = ""
    webhook_url: str = ""
    wait_for_decision: bool = True
    timeout_sec: int = 75
    voice: str = "alice"
    language: str = "en-IN"
    case_id: str = ""
    dry_run: bool = False


class Output(BaseModel):
    placed: bool = False        # was a real call placed?
    two_way: bool = False       # driven by the webhook (conversation) vs one-way?
    call_sid: str = ""
    status: str = ""           # queued / ringing / ... / dry_run
    decision: str = ""         # approved / hold / no_answer / pending  (two-way)
    to: str = ""
    from_: str = ""
    twiml: str = ""            # one-way: the spoken script
    error: str = ""


def _twilio_creds() -> tuple[str, str, str]:
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    frm = os.environ.get("TWILIO_FROM_NUMBER")
    if not (sid and token):
        sid = sid or _asset("Twilio-Account-Sid")
        token = token or _asset("Twilio-Auth-Token")
        frm = frm or _asset("Twilio-From-Number")
    return sid or "", token or "", frm or ""


def _webhook_url() -> str:
    return (os.environ.get("VOICE_WEBHOOK_URL") or _asset("Voice-Webhook-Url") or "").rstrip("/")


def _asset(name: str) -> str | None:
    try:
        from uipath.platform import UiPath  # lazy — local runs with env need no UiPath

        a = UiPath().assets.retrieve(name, folder_path="Shared")
        return (
            getattr(a, "string_value", None)
            or getattr(a, "value", None)
            or getattr(a, "credential_password", None)
        )
    except Exception:  # noqa: BLE001
        return None


def _build_twiml(message: str, voice: str, language: str) -> str:
    spoken = escape(message.strip() or "This is an automated escalation call from FOREMAN.")
    v, lang = escape(voice), escape(language)
    return (
        "<Response>"
        f'<Say voice="{v}" language="{lang}">{spoken}</Say>'
        '<Pause length="1"/>'
        f'<Say voice="{v}" language="{lang}">This was an automated escalation from FOREMAN. Goodbye.</Say>'
        "</Response>"
    )


async def place_call(state: State) -> Output:
    sid, auth, frm = _twilio_creds()
    frm = state.from_number or frm
    webhook = (state.webhook_url or _webhook_url()).rstrip("/")
    two_way = bool(webhook)

    if state.dry_run:
        missing = [n for n, v in (("to_number", state.to_number), ("creds", sid and auth), ("from_number", frm)) if not v]
        note = f"two-way via {webhook}" if two_way else "one-way (no webhook set — speaks then hangs up)"
        return Output(
            placed=False, two_way=two_way, status="dry_run", to=state.to_number, from_=frm,
            twiml="" if two_way else _build_twiml(state.message, state.voice, state.language),
            error=(f"dry-run OK — mode: {note}" + (f"; fill before a real call: {', '.join(missing)}" if missing else "")),
        )

    if not state.to_number:
        return Output(error="to_number is required")
    if not (sid and auth):
        return Output(error="Twilio credentials not found (env TWILIO_* or Assets Twilio-*)", to=state.to_number, from_=frm)
    if not frm:
        return Output(error="No from_number — set TWILIO_FROM_NUMBER / Asset Twilio-From-Number / input.", to=state.to_number)

    from twilio.rest import Client

    client = Client(sid, auth)

    # ── ONE-WAY fallback ────────────────────────────────────────────────────
    if not two_way:
        twiml = _build_twiml(state.message, state.voice, state.language)
        try:
            call = client.calls.create(to=state.to_number, from_=frm, twiml=twiml)
            return Output(placed=True, two_way=False, call_sid=call.sid or "", status=call.status or "queued",
                          to=state.to_number, from_=frm, twiml=twiml)
        except Exception as e:  # noqa: BLE001
            return Output(error=f"Twilio call failed: {e}", to=state.to_number, from_=frm, twiml=twiml)

    # ── TWO-WAY (webhook-driven conversation) ───────────────────────────────
    tok = uuid.uuid4().hex
    async with httpx.AsyncClient(timeout=15) as hc:
        try:
            await hc.post(f"{webhook}/prepare", json={
                "token": tok, "message": state.message,
                "recommendation": state.recommendation, "case_id": state.case_id,
                "to_role": state.to_role, "site_id": state.site_id,
                "title": state.title, "to_number": state.to_number,
            })
        except Exception as e:  # noqa: BLE001
            return Output(error=f"Voice webhook unreachable at {webhook}/prepare: {e}", to=state.to_number, from_=frm)

        try:
            call = client.calls.create(to=state.to_number, from_=frm, url=f"{webhook}/voice?token={tok}")
        except Exception as e:  # noqa: BLE001
            return Output(error=f"Twilio call failed: {e}", to=state.to_number, from_=frm)

        decision = "pending"
        if state.wait_for_decision:
            deadline = time.monotonic() + max(20, state.timeout_sec)
            decision = "no_answer"
            while time.monotonic() < deadline:
                await asyncio.sleep(2)
                try:
                    d = (await hc.get(f"{webhook}/decision", params={"token": tok})).json()
                except Exception:  # noqa: BLE001
                    continue
                if d.get("status") == "decided":
                    decision = d.get("decision") or "unclear"
                    break

    return Output(placed=True, two_way=True, call_sid=call.sid or "", status=call.status or "queued",
                  decision=decision, to=state.to_number, from_=frm)


builder = StateGraph(State, input=Input, output=Output)
builder.add_node("place_call", place_call)
builder.add_edge(START, "place_call")
builder.add_edge("place_call", END)

graph = builder.compile()
