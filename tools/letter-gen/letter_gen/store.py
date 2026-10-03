"""pool/accepted, pool/needs_review, pool/rejected and pool/index.json."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

STATUSES = ("accepted", "needs_review", "rejected")


class Pool:
    def __init__(self, root: Path) -> None:
        self.root = root
        for s in STATUSES:
            (root / s).mkdir(parents=True, exist_ok=True)

    # --- records ---------------------------------------------------------------------
    def path_of(self, letter_id: str) -> Path | None:
        for s in STATUSES:
            p = self.root / s / f"{letter_id}.json"
            if p.exists():
                return p
        return None

    def load(self, letter_id: str) -> dict[str, Any] | None:
        p = self.path_of(letter_id)
        return json.loads(p.read_text(encoding="utf-8")) if p else None

    def all(self) -> Iterator[dict[str, Any]]:
        for s in STATUSES:
            for p in sorted((self.root / s).glob("*.json")):
                yield json.loads(p.read_text(encoding="utf-8"))

    def save(self, rec: dict[str, Any]) -> None:
        old = self.path_of(rec["id"])
        new = self.root / rec["status"] / f"{rec['id']}.json"
        new.write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if old and old != new:
            old.unlink()

    # --- ids and names -----------------------------------------------------------------
    def next_ids(self, directions: list[str]) -> list[str]:
        """Fresh ids, numbered per direction after the highest one in the pool."""
        highest: Counter[str] = Counter()
        for rec in self.all():
            d, n = rec["direction"], int(rec["id"].rsplit("_", 1)[1])
            highest[d] = max(highest[d], n)
        out = []
        for d in directions:
            highest[d] += 1
            out.append(f"pool_{d}_{highest[d]:06d}")
        return out

    def name_uses(self) -> Counter[str]:
        """How often each first name already appears (as sender or recipient)."""
        c: Counter[str] = Counter()
        for rec in self.all():
            c[rec["sender"]["name"]] += 1
            if rec["recipient"].get("name"):
                c[rec["recipient"]["name"]] += 1
        return c

    # --- index ---------------------------------------------------------------------------
    def write_index(self) -> list[dict[str, Any]]:
        rows = []
        for rec in self.all():
            rows.append(
                {
                    "id": rec["id"],
                    "direction": rec["direction"],
                    "sender": f"{rec['sender'].get('epithet') or ''} {rec['sender']['name']}".strip(),
                    "recipient": rec["recipient"].get("name"),
                    "status": rec["status"],
                    "scores": (rec.get("review") or {}).get("scores"),
                    "warnings": [k for k, v in (rec.get("checks") or {}).items() if v["result"] == "warn"],
                    "failed": [k for k, v in (rec.get("checks") or {}).items() if v["result"] == "fail"],
                }
            )
        rows.sort(key=lambda r: r["id"])
        (self.root / "index.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return rows
