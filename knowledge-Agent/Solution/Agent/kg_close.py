"""Demonstrate the *learning* half of the knowledge graph — the Close stage.

When a case is resolved, FOREMAN writes the confirmed failure back into the
graph: the asset now EXHIBITS a FailureMode, its site is marked, and once enough
siblings on the same batch fail, the batch itself is flagged 'failure_pattern'.
That flag is what makes the NEXT case smarter — the second corroded plug on
NG-BATCH-22 is recognised as systemic immediately.

    uv run python kg_close.py

Re-run it for MUM/GOA to watch the batch flip to 'failure_pattern' at threshold 2.
"""
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
for _l in open(os.path.join(_HERE, ".env"), encoding="utf-8"):
    _l = _l.strip()
    if _l and not _l.startswith("#") and "=" in _l:
        _k, _, _v = _l.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

import kg  # noqa: E402

if __name__ == "__main__":
    rows = kg.grow_graph(
        asset_id="AST-RF-DEL-0473",
        failure_mode="connector_corrosion",
        confidence=0.91,
        case_id="CASE-0916",
        ts="2026-06-21T10:15:00Z",
        threshold=2,
    )
    res = rows[0] if rows else {}
    print("Graph grown from CASE-0916:")
    print("  asset      : AST-RF-DEL-0473 -[:EXHIBITS]-> connector_corrosion")
    print(f"  batch      : {res.get('batch_id','')}  status={res.get('status','')}")
    print(f"  siblings exhibiting this failure on batch: {res.get('hits', 0)}")
    if res.get("status") == "failure_pattern":
        print("  -> Batch crossed the threshold: now a recognised failure pattern.")
    else:
        print("  -> Not yet a pattern; close more siblings (MUM/GOA) to cross threshold.")
