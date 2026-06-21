"""Wipe the graph and re-seed it to a pristine demo state.

Use this between demo runs: it clears everything (including the learned EXHIBITS
edges and any 'failure_pattern' batch flags), then re-applies constraints and the
seed so blast-radius starts fresh.

    uv run python kg_reset.py
"""
import os

for _l in open(".env", encoding="utf-8"):
    _l = _l.strip()
    if _l and not _l.startswith("#") and "=" in _l:
        _k, _, _v = _l.partition("=")
        os.environ.setdefault(_k.strip(), _v.strip())

import kg  # noqa: E402
from kg_seed import seed  # noqa: E402

if __name__ == "__main__":
    with kg.driver() as d, d.session(database=kg.database()) as ses:
        ses.run("MATCH (n) DETACH DELETE n")
    print("Wiped graph.")
    seed()
    print("Re-seeded pristine demo state.")
