"""Run the agent locally against a local mp4 — no UiPath auth / bucket needed.

    uv run python test_local.py [path-to-clip.mp4]

Loads OPENAI_API_KEY from .env, invokes the graph with bucket_name="" so the
perceive node uses the local file directly, prints the structured Output. The
emit() calls will try the view-backend (FOREMAN_BACKEND_URL, default
localhost:8000); if it isn't running they fail fast and are ignored.
"""
import asyncio
import os
import sys

# Load .env (OPENAI_API_KEY, FOREMAN_*) without depending on python-dotenv.
_HERE = os.path.dirname(os.path.abspath(__file__))
for _line in open(os.path.join(_HERE, ".env"), encoding="utf-8"):
    _line = _line.strip()
    if _line and not _line.startswith("#") and "=" in _line:
        _k, _, _v = _line.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

from main import graph  # noqa: E402  (after env is loaded)

CLIP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(_HERE, "sample-clip.mp4")


async def main() -> None:
    print(f"Running agent against: {CLIP}\n")
    out = await graph.ainvoke({
        "case_id": "CASE-LOCAL-TEST",
        "site_id": "DEL-0473",
        "bucket_name": "",  # empty → perceive() uses the local file directly
        "media_path": CLIP,
        "text": "Aerial RF connector looks corroded — green/white deposits at the plug.",
        "folder_path": "Shared",
    })
    print("\n===================  AGENT OUTPUT  ===================")
    for k, v in out.items():
        print(f"  {k:18}: {v}")
    print("=====================================================")


if __name__ == "__main__":
    asyncio.run(main())
