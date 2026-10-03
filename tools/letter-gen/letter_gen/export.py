"""Merges accepted letters into the game's content file."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Pipeline bookkeeping that the game has no use for.
_DROP = ("meta", "checks", "review", "status", "parse_error", "history", "length_target")


def to_game(rec: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in rec.items() if k not in _DROP}


def export(records: list[dict[str, Any]], out: Path) -> int:
    accepted = sorted((r for r in records if r["status"] == "accepted"), key=lambda r: r["id"])
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": 1, "letters": [to_game(r) for r in accepted]}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(accepted)
