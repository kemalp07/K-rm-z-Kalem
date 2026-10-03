"""The stored letter record (one JSON file per letter) and its human-readable form."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .parser import ParsedLetter
from .sampler import Request


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def hand_for(req: Request) -> str:
    """The game's handwriting style for this letter."""
    if req.writes != "self":
        return "dictated"
    return {"low": "hurried", "mid": "careful", "high": "elegant"}.get(req.literacy, "careful")


def _person(p: Any, with_rank: bool) -> dict[str, Any]:
    d = {
        "name": p.name,
        "epithet": p.epithet,
        "age": p.age,
        "hometown": p.hometown,
        "occupation": p.occupation,
    }
    if with_rank and p.rank:
        d["rank"] = p.rank
    if p.relation:
        d["relation"] = p.relation
    return d


def build(
    letter_id: str,
    req: Request,
    request_text: str,
    parsed: ParsedLetter | None,
    meta: dict[str, Any],
    parse_error: str | None = None,
) -> dict[str, Any]:
    rec: dict[str, Any] = {
        "id": letter_id,
        "tier": "pool",
        "direction": req.direction,
        "sender": _person(req.sender, with_rank=True),
        "recipient": {
            "name": req.recipient.name,
            "relation": req.recipient.relation or req.soldier_relation,
            "location": req.recipient_location,
            **({"rank": req.recipient.rank} if req.recipient.rank else {}),
        },
        "writes": req.writes,
        "writer": req.writer,
        "literacy": req.literacy,
        "carelessness": req.carelessness,
        "length_target": req.length_target,
        "hand": hand_for(req),
        "header": None,
        "salutation": None,
        "segments": [],
        "closing": None,
        "signature": None,
        "note": None,
        "envelope": None,
        "package": req.package,
        "meta": {"request": request_text, "request_fields": req.to_dict(), **meta},
        "checks": {},
        "review": None,
        "status": "rejected" if parse_error else "needs_review",
        "parse_error": parse_error,
        "history": [],
    }
    if parsed:
        rec.update(
            header={"text": parsed.header.text, "sensitive": parsed.header.sensitive},
            salutation=parsed.salutation,
            segments=[{"id": s.id, "text": s.text, "kind": s.kind, "para": s.para} for s in parsed.segments],
            closing=parsed.closing,
            signature={"text": parsed.signature, **({"seal": parsed.seal} if parsed.seal else {})},
            note={"text": parsed.note.text, "sensitive": parsed.note.sensitive} if parsed.note else None,
            envelope={"text": parsed.envelope.text, "sensitive": parsed.envelope.sensitive},
        )
    return rec


def set_status(rec: dict[str, Any], status: str, by: str, note: str = "") -> None:
    if rec.get("status") != status or not rec.get("history"):
        rec.setdefault("history", []).append({"status": status, "at": now(), "by": by, **({"note": note} if note else {})})
    rec["status"] = status


def body_text(rec: dict[str, Any]) -> str:
    return " ".join(s["text"] for s in rec.get("segments", []))


def readable(rec: dict[str, Any], mark_sensitive: bool = True, with_package: bool = True) -> str:
    """The letter as a person would read it; sensitive parts in ⟦ ⟧ when asked.

    The package line is ours, not the writer's: leave it out where it could be taken as
    part of the letter (the critic sees the package in the request anyway).
    """

    def m(text: str, sensitive: bool) -> str:
        return f"⟦{text}⟧" if mark_sensitive and sensitive else text

    if not rec.get("segments"):
        return rec.get("meta", {}).get("raw", "") or "(boş)"
    lines = []
    if rec.get("header"):
        lines.append(m(rec["header"]["text"], rec["header"]["sensitive"]))
    lines += ["", rec.get("salutation") or "", ""]
    paras: dict[int, list[str]] = {}
    for s in rec["segments"]:
        paras.setdefault(s.get("para", 0), []).append(m(s["text"], s["kind"] == "sensitive"))
    lines += ["\n\n".join(" ".join(v) for _, v in sorted(paras.items())), ""]
    lines.append(rec.get("closing") or "")
    sig = rec.get("signature") or {}
    lines.append(" ".join(p for p in (sig.get("text", ""), f"(mühür: {sig['seal']})" if sig.get("seal") else "") if p))
    if rec.get("note"):
        lines += ["", "Not: " + m(rec["note"]["text"], rec["note"]["sensitive"])]
    if rec.get("envelope"):
        lines += ["", "Zarf: " + m(rec["envelope"]["text"], rec["envelope"]["sensitive"])]
    if with_package and rec.get("package"):
        lines += ["Paket: " + ", ".join(rec["package"])]
    return "\n".join(lines).strip()


def labelled(rec: dict[str, Any]) -> str:
    """The letter in the card's output format (BAŞLIK: … ZARF: …), sensitive parts in ⟦ ⟧."""

    def m(text: str, sensitive: bool) -> str:
        return f"⟦{text}⟧" if sensitive else text

    paras: dict[int, list[str]] = {}
    for s in rec.get("segments", []):
        paras.setdefault(s.get("para", 0), []).append(m(s["text"], s["kind"] == "sensitive"))
    sig = rec.get("signature") or {}
    signature = " ".join(p for p in (f"(mühür: {sig['seal']})" if sig.get("seal") else "", sig.get("text", "")) if p)
    lines = [
        "BAŞLIK: " + m(rec["header"]["text"], rec["header"]["sensitive"]),
        "HİTAP: " + (rec.get("salutation") or ""),
        "GÖVDE: " + "\n\n".join(" ".join(v) for _, v in sorted(paras.items())),
        "KAPANIŞ: " + (rec.get("closing") or ""),
        "İMZA: " + signature,
    ]
    if rec.get("note"):
        lines.append("NOT: " + m(rec["note"]["text"], rec["note"]["sensitive"]))
    lines.append("ZARF: " + m(rec["envelope"]["text"], rec["envelope"]["sensitive"]))
    return "\n".join(lines)
