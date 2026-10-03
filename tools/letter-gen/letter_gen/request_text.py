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


def _field_values(req: Request, pools: dict[str, Any]) -> dict[str, str | None]:
    lab = pools["labels"]
    s, r = req.sender, req.recipient
    if req.direction == "cepheden":
        sender = f"{s.epithet} {s.name} (asker)"
        recipient = f"{r.name}, askerin {r.relation}"
    else:
        sender = f"{s.epithet} {s.name}, askerin {s.relation}"
        recipient = f"{r.name}, gönderenin {req.soldier_relation} ({r.rank})"
    return {
        "direction": lab["direction"][req.direction],
        "sender": sender,
        "sender_age": str(s.age),
        "hometown": s.hometown,
        "occupation": s.occupation,
        "rank": s.rank,
        "recipient": recipient,
        "recipient_location": req.recipient_location,
        "writes": lab["writes"][req.writes],
        "writer": req.writer,
        "literacy": lab["literacy"][req.literacy],
        "voice": req.voice,
        "topic": req.topic,
        "hidden": req.hidden,
        "carelessness": lab["carelessness"][req.carelessness],
        "sensitive_info": req.sensitive_info,
        "length": f"{req.length_label} (yaklaşık {req.length_target} kelime)",
        "package": ", ".join(req.package) if req.package else None,
    }


def label_order(pools: dict[str, Any], mes_example: str) -> tuple[list[str], list[str]]:
    """Labels to write, and card labels that have no mapping in pools.yaml."""
    mapping: dict[str, str] = pools["request_labels"]
    from_card = card_labels(mes_example, pools["request_header"])
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
