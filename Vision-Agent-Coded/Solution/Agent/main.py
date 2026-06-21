"""FOREMAN — coded vision + root-cause agent (UiPath / LangGraph / OpenAI).

Flow (each step emits a CaseEvent → view-backend → live UI):
  1. download the mp4 from the UiPath storage bucket (UiPath SDK)
  2. sample frames (OpenAI vision takes images, not raw video)
  3. vision → structured Perception
  4. root cause → structured RootCause + risk score
  5. return Output for the Maestro Case to branch on (confirm / escalate / resolve)

The Maestro Case "starts & waits for" this agent at the Perceive stage, passing
the case data (case_id, site_id, bucket + media path, worker text).
"""
import base64
import os
import tempfile
from functools import lru_cache
from typing import Any

import cv2  # opencv-python-headless — frame sampling
from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from uipath.platform import UiPath
from langchain_openai import ChatOpenAI

from foreman_events import configure, emit, log


# Direct OpenAI via LangChain. Key resolution: OPENAI_API_KEY env var (.env, local),
# else a UiPath Credential Asset named "OpenAI-Key" in the Shared folder (cloud).
# Built lazily so `uipath init` (schema gen) imports without needing the key.
@lru_cache(maxsize=1)
def _llm() -> ChatOpenAI:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        a = UiPath().assets.retrieve("OpenAI-Key", folder_path="Shared")
        key = (
            getattr(a, "string_value", None)
            or getattr(a, "value", None)
            or getattr(a, "credential_password", None)
        )
    return ChatOpenAI(model="gpt-5-mini", api_key=key)


# ── Agent I/O contract (the Maestro Case passes Input, consumes Output) ───────
class Input(BaseModel):
    case_id: str = Field(description="Maestro case id, e.g. CASE-0916")
    site_id: str = Field(default="", description="Tower site id, e.g. DEL-0473")
    bucket_name: str = Field(description="Storage bucket holding the media")
    media_path: str = Field(description="Blob path of the mp4 inside the bucket")
    text: str = Field(default="", description="The worker's message text")
    folder_path: str = Field(default="Shared", description="Orchestrator folder of the bucket")
    backend_url: str = Field(default="", description="Public URL of the view-backend (cloud); empty = localhost")


class State(BaseModel):
    case_id: str = ""
    site_id: str = ""
    bucket_name: str = ""
    media_path: str = ""
    text: str = ""
    folder_path: str = "Shared"
    backend_url: str = ""
    perception: dict[str, Any] = {}
    investigation: dict[str, Any] = {}


class Output(BaseModel):
    root_cause: str = ""
    confidence: float = 0.0
    risk_score: float = 0.0
    recommendation: str = ""
    corrosion_severity: str = ""
    issues: list[str] = []


# ── LLM structured outputs ────────────────────────────────────────────────────
class Perception(BaseModel):
    corrosion_present: bool
    corrosion_severity: str = Field(description="none | low | medium | high")
    generator_anomaly: str = Field(default="none", description="e.g. knock | none")
    generator_confidence: float = 0.0
    issues: list[str] = Field(description="short machine tags, e.g. rf_cable_corrosion")


class RootCause(BaseModel):
    root_cause: str
    confidence: float = Field(ge=0, le=1)
    alternatives_ruled_out: list[str]
    recommendation: str
    risk_score: float = Field(ge=0, le=1)


def _sample_frames(path: str, n: int = 6) -> list[str]:
    """N evenly-spaced frames from the mp4 as base64 image data-URLs."""
    cap = cv2.VideoCapture(path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    urls: list[str] = []
    for i in range(n):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * i / n))
        ok, frame = cap.read()
        if not ok:
            continue
        ok2, buf = cv2.imencode(".jpg", frame)
        if ok2:
            urls.append("data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode())
    cap.release()
    return urls


# ── Nodes ─────────────────────────────────────────────────────────────────────
async def perceive(state: State) -> dict[str, Any]:
    cid = state.case_id
    configure(state.backend_url)  # point emits at the public backend (cloud) when provided
    emit(cid, {"kind": "stage.entered", "stage": "perceive"})
    emit(cid, {"kind": "agent.running", "agent": "vision"})
    log(cid, "perceive", "Vision · OpenAI", "Downloading clip + sampling frames")

    # Resolve the clip: a local file (testing) or a bucket download (production).
    # If bucket_name is empty or media_path is already a local file, use it directly.
    if state.bucket_name and not os.path.exists(state.media_path):
        sdk = UiPath()
        local_mp4 = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
        await sdk.buckets.download_async(
            name=state.bucket_name,
            blob_file_path=state.media_path,
            destination_path=local_mp4,
            folder_path=state.folder_path,
        )
    else:
        local_mp4 = state.media_path

    frames = _sample_frames(local_mp4)
    content: list[Any] = [{
        "type": "text",
        "text": (
            "You are an RF / telecom field inspector. From these tower-site video frames "
            "and the worker's note, report corrosion and any generator audio cues you can "
            f"infer. Worker note: {state.text}"
        ),
    }]
    content += [{"type": "image_url", "image_url": {"url": u}} for u in frames]

    p: Perception = await _llm().with_structured_output(Perception).ainvoke(
        [HumanMessage(content=content)]
    )
    perception = {
        "corrosion": {"present": p.corrosion_present, "severity": p.corrosion_severity},
        "generator_audio": {"anomaly": p.generator_anomaly, "confidence": p.generator_confidence},
        "issues": p.issues,
    }
    emit(cid, {"kind": "perception.ready", "perception": perception,
               "asset_note": f"{state.site_id} · analysed by OpenAI vision"})
    emit(cid, {"kind": "agent.completed", "agent": "vision", "run": {
        "headline": f"Corrosion {p.corrosion_severity}",
        "detail": ", ".join(p.issues), "confidence": 0.85}})
    return {"perception": perception}


async def diagnose(state: State) -> dict[str, Any]:
    cid = state.case_id
    emit(cid, {"kind": "stage.entered", "stage": "investigate"})
    emit(cid, {"kind": "agent.running", "agent": "rootcause"})
    log(cid, "investigate", "Root-cause · OpenAI", "Weighing the evidence to a cause")

    rc: RootCause = await _llm().with_structured_output(RootCause).ainvoke(
        f"Perception: {state.perception}\nWorker note: {state.text}\n"
        "Decide the single most likely root cause, list the alternatives you ruled out, "
        "recommend one action, and score operational risk between 0 and 1."
    )
    investigation = {
        "root_cause": rc.root_cause,
        "confidence": rc.confidence,
        "alternatives_ruled_out": rc.alternatives_ruled_out,
        "systemic": False,
        "fleet_affected": 0,
        "risk_score": rc.risk_score,
        "recommendation": rc.recommendation,
    }
    emit(cid, {"kind": "agent.completed", "agent": "rootcause", "run": {
        "headline": rc.root_cause, "detail": rc.recommendation, "confidence": rc.confidence}})
    emit(cid, {"kind": "risk.scored", "risk": rc.risk_score})
    emit(cid, {"kind": "investigation.ready", "investigation": investigation})
    log(cid, "investigate", "Supervisor", f"Recommendation ready · risk {rc.risk_score:.2f}")
    return {"investigation": investigation}


async def finalize(state: State) -> Output:
    inv, per = state.investigation, state.perception
    return Output(
        root_cause=inv.get("root_cause", ""),
        confidence=float(inv.get("confidence", 0.0)),
        risk_score=float(inv.get("risk_score", 0.0)),
        recommendation=inv.get("recommendation", ""),
        corrosion_severity=per.get("corrosion", {}).get("severity", ""),
        issues=per.get("issues", []),
    )


# ── Graph ─────────────────────────────────────────────────────────────────────
builder = StateGraph(State, input=Input, output=Output)
builder.add_node("perceive", perceive)
builder.add_node("diagnose", diagnose)
builder.add_node("finalize", finalize)
builder.add_edge(START, "perceive")
builder.add_edge("perceive", "diagnose")
builder.add_edge("diagnose", "finalize")
builder.add_edge("finalize", END)

graph = builder.compile()
