"""Turns a Request into the card's [MEKTUP İSTEĞİ] text."""

from __future__ import annotations

import re
from typing import Any

from .sampler import Request
from .text import fold


def card_labels(mes_example: str, header: str) -> list[str]:
    """Labels of the first [MEKTUP İSTEĞİ] block in the card's examples, in order."""
    lines = mes_example.splitlines()
    for i, line in enumerate(lines):
        if fold(header) in fold(line):
            labels = []
            for nxt in lines[i + 1 :]:
                if re.match(r"^\s*\{\{char\}\}:", nxt) or "<START>" in nxt:
                    break  # the example's answer begins: the request is over
                s = re.sub(r"^\{\{user\}\}:\s*", "", nxt.strip())
                if not s:
                    if labels:
                        break
                    continue
                m = re.match(r"^([^:\n]{1,40}):", s)
                if not m:
                    break
                labels.append(m.group(1).strip())
            return labels
    return []


def _titled(name: str, gender: str, age: int, pools: dict[str, Any]) -> str:
    lab = pools["labels"]
    if gender == "kadın" and age >= lab.get("woman_title_min_age", 16):
        return f"{name} {lab['woman_title']}"
    return name


def _cap(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def _field_values(req: Request, pools: dict[str, Any]) -> dict[str, str | None]:
    """Values written the way the card's own examples write them."""
    lab = pools["labels"]
    s, r = req.sender, req.recipient
    sender_name = _titled(s.name, s.gender, s.age, pools)
    recipient_name = _titled(r.name, r.gender, r.age, pools)
    if req.direction == "cepheden":
        # "Hasan, Sivaslı, 24, çiftçi, er (Sivas, Hafik kazası, Kızılca karyesi)"
        sender = f"{sender_name}, {s.epithet}, {s.age}, {s.occupation}, {s.rank} ({req.home_address})"
        recipient = f"{_cap(r.relation or '')} {recipient_name}, {req.recipient_location}"
    else:
        sender = f"{sender_name}, {s.epithet}, {s.age}, {s.occupation} ({req.home_address})"
        recipient = f"{_cap(req.soldier_relation)} {_cap(r.rank or '')} {recipient_name}, {lab['soldier_location']}"
    writes = lab["writes"][req.writes].format(writer=req.writer or "")
    return {
        "direction": lab["direction"][req.direction],
        "sender": sender,
        "recipient": recipient,
        "writes": writes,
        "literacy": lab["literacy"][req.literacy],
        "voice": req.voice,
        "topic": req.topic,
        "hidden": req.hidden,
        "sensitive_info": req.sensitive_info,
        "carelessness": lab["carelessness"][req.carelessness],
        "prev_state": req.prev_state or None,
        "unseen": None,
        "readable_words": None,
        "package": ", ".join(req.package) if req.package else None,
        "length": str(req.length_target),
        "variation": None,
    }


def label_order(pools: dict[str, Any], *card_texts: str) -> tuple[list[str], list[str]]:
    """Labels to write, and card labels that have no mapping in pools.yaml.

    The first card text holding a [MEKTUP İSTEĞİ] block gives the order: pass the
    greeting (which shows the full template) before the examples.
    """
    mapping: dict[str, str] = pools["request_labels"]
    from_card: list[str] = []
    for text in card_texts:
        from_card = card_labels(text, pools["request_header"])
        if from_card:
            break
    if not from_card:
        return list(mapping), []
    by_fold = {fold(k): k for k in mapping}
    unknown = [l for l in from_card if fold(l) not in by_fold]
    return [by_fold[fold(l)] for l in from_card if fold(l) in by_fold], unknown


def render(req: Request, pools: dict[str, Any], labels: list[str]) -> str:
    values = _field_values(req, pools)
    mapping: dict[str, str] = pools["request_labels"]
    lines = [pools["request_header"]]
    for label in labels:
        v = values.get(mapping[label])
        if v:  # a field that does not apply (rank of a mother, no package) is left out
            lines.append(f"{label}: {v}")
    return "\n".join(lines)
