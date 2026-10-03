"""pool/report.md: what needs a human first, then why things were rejected, then numbers."""

from __future__ import annotations

from collections import Counter
from typing import Any

from .checks import CHECK_NAMES
from .record import readable
from .review import CRITERIA

_LABELS = {
    "carelessness": {"none": "yok", "low": "az", "high": "çok"},
    "literacy": {"none": "okuma yazma yok", "low": "az", "mid": "orta", "high": "iyi"},
}


def _checks_md(checks: dict[str, Any], only_problems: bool = True) -> list[str]:
    out = []
    for k, v in checks.items():
        if only_problems and v["result"] == "pass":
            continue
        mark = {"pass": "✓", "warn": "⚠", "fail": "✗"}[v["result"]]
        out.append(f"- {mark} **{CHECK_NAMES.get(k, k)}**" + (f": {v['detail']}" if v.get("detail") else ""))
    return out


def _review_md(review: dict[str, Any] | None) -> list[str]:
    if not review:
        return ["_Eleştirmenden henüz geçmedi._"]
    out = ["| Ölçüt | Puan | Gerekçe |", "|---|---|---|"]
    for k, label in CRITERIA.items():
        name = label.split(":")[0]
        out.append(f"| {name} | {review['scores'].get(k, '—')} | {(review.get('reasons') or {}).get(k, '')} |")
    issues = review.get("issues") or []
    if issues:
        out += ["", "Önerilen düzeltmeler:"]
        for i in issues:
            out.append(f"- «{i.get('line', '')}» — {i.get('problem', '')} → _{i.get('suggestion', '')}_")
    return out


def _title(rec: dict[str, Any]) -> str:
    s, r = rec["sender"], rec["recipient"]
    arrow = "→"
    return f"{rec['id']} · {s.get('epithet') or ''} {s['name']} {arrow} {r.get('name') or ''} ({r.get('relation') or ''})"


def build(records: list[dict[str, Any]], run_summary: str = "") -> str:
    lines = ["# Mektup havuzu raporu", ""]
    if run_summary:
        lines += [run_summary, ""]

    review = [r for r in records if r["status"] == "needs_review"]
    rejected = [r for r in records if r["status"] == "rejected"]
    accepted = [r for r in records if r["status"] == "accepted"]
    lines += [f"Toplam {len(records)} mektup: {len(accepted)} kabul, {len(review)} elle bakılacak, {len(rejected)} red.", ""]

    lines += ["## Elle bakılacaklar", ""]
    if not review:
        lines += ["_Yok._", ""]
    for rec in review:
        lines += [f"### {_title(rec)}", "", "<details><summary>İstek</summary>", "", "```", rec["meta"]["request"], "```", "</details>", ""]
        lines += ["```", readable(rec), "```", ""]
        problems = _checks_md(rec.get("checks") or {})
        if problems:
            lines += ["**Kontrol uyarıları**", ""] + problems + [""]
        lines += ["**Eleştirmen**", ""] + _review_md(rec.get("review")) + [""]

    lines += ["## Reddedilenler", ""]
    if not rejected:
        lines += ["_Yok._", ""]
    for rec in rejected:
        reasons = []
        if rec.get("parse_error"):
            reasons.append("biçim: " + rec["parse_error"])
        for k, v in (rec.get("checks") or {}).items():
            if v["result"] == "fail" and k != "format":
                reasons.append(f"{CHECK_NAMES.get(k, k)}: {v.get('detail', '')}")
        rv = rec.get("review")
        if rv:
            low = [f"{CRITERIA[k].split(':')[0]} {v}" for k, v in rv["scores"].items() if v <= 2]
            if low:
                reasons.append("eleştirmen: " + ", ".join(low))
        if rec.get("history") and rec["history"][-1].get("by") == "manual":
            reasons.append("elle reddedildi" + (f": {rec['history'][-1].get('note')}" if rec["history"][-1].get("note") else ""))
        lines.append(f"- **{rec['id']}** — " + ("; ".join(reasons) or "?"))
    lines.append("")

    lines += ["## İstatistik", ""] + stats_md(records)
    return "\n".join(lines) + "\n"


def stats_md(records: list[dict[str, Any]]) -> list[str]:
    def table(title: str, counter: Counter[str], top: int | None = None) -> list[str]:
        rows = counter.most_common(top)
        out = [f"**{title}**", "", "| | Sayı |", "|---|---|"]
        out += [f"| {k} | {v} |" for k, v in rows]
        return out + [""]

    status = Counter(r["status"] for r in records)
    direction = Counter(r["direction"] for r in records)
    care = Counter(_LABELS["carelessness"].get(r["carelessness"], r["carelessness"]) for r in records)
    lit = Counter(_LABELS["literacy"].get(r["literacy"], r["literacy"]) for r in records)
    towns = Counter(r["sender"].get("hometown") or "?" for r in records)
    names = Counter()
    for r in records:
        names[r["sender"]["name"]] += 1
        if r["recipient"].get("name"):
            names[r["recipient"]["name"]] += 1
    warns: Counter[str] = Counter()
    for r in records:
        for k, v in (r.get("checks") or {}).items():
            if v["result"] != "pass":
                warns[f"{CHECK_NAMES.get(k, k)} ({v['result']})"] += 1
    return (
        table("Durum", status)
        + table("Yön", direction)
        + table("Dikkatsizlik", care)
        + table("Okuryazarlık", lit)
        + table("Memleket", towns)
        + table("En çok kullanılan isimler", names, 10)
        + table("En sık uyarılar", warns, 10)
    )
