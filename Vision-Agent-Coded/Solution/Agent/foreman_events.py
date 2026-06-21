"""Bridge from the coded agent to the FOREMAN view-backend (which fans events
out to the live UI over WebSocket). Each call is one normalized CaseEvent — the
exact shape src/types.ts consumes, so the dashboard renders it identically to
the scripted demo.

Config resolution:
  • local : FOREMAN_BACKEND_URL / FOREMAN_INGEST_SECRET env vars (.env)
  • cloud : the Maestro Case passes the public backend URL as the `backend_url`
            agent input → main.py calls configure(...) before the first emit.
"""
import os
import time

import httpx  # bundled with the uipath SDK

_backend = os.environ.get("FOREMAN_BACKEND_URL", "http://localhost:8000").rstrip("/")
_secret = os.environ.get("FOREMAN_INGEST_SECRET", "dev-secret")


def configure(backend_url: str | None = None, secret: str | None = None) -> None:
    """Override the backend URL / secret at runtime (e.g. from agent input or an Asset)."""
    global _backend, _secret
    if backend_url:
        _backend = backend_url.rstrip("/")
    if secret:
        _secret = secret


def emit(case_id: str, event: dict) -> None:
    """POST one CaseEvent. Telemetry must never break the agent, so swallow errors."""
    try:
        httpx.post(
            f"{_backend}/ingest/{case_id}",
            json=event,
            headers={"x-foreman-secret": _secret},
            timeout=5.0,
        )
    except Exception as e:  # noqa: BLE001
        print(f"[foreman_events] emit failed: {e}")


def log(case_id: str, stage: str, source: str, text: str, tone: str = "agent") -> None:
    """Convenience for the live activity feed."""
    emit(case_id, {
        "kind": "log",
        "entry": {
            "ts": time.strftime("%H:%M:%S"),
            "stage": stage,
            "source": source,
            "text": text,
            "tone": tone,
        },
    })
