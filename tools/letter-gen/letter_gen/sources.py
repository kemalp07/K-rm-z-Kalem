"""Reads the SillyTavern character card and world-info (lorebook) files.

Nothing from these files is copied into code: every run reads them again, so editing
the card or the lorebook changes the generator's behaviour.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .text import fold


@dataclass
class Card:
    name: str
    description: str
    system_prompt: str
    mes_example: str
    post_history_instructions: str
    depth_prompt: str
    # The greeting; this card uses it to show the full request template.
    first_mes: str = ""


@dataclass
class LoreEntry:
    uid: str
    comment: str
    content: str
    keys: list[str] = field(default_factory=list)
    constant: bool = False
    order: int = 100
    disabled: bool = False


def load_card(path: Path) -> Card:
    raw = json.loads(path.read_text(encoding="utf-8"))
    # chara_card_v2 keeps everything under "data"; v1 cards are flat.
    data = raw.get("data", raw)
    depth = ((data.get("extensions") or {}).get("depth_prompt") or {}).get("prompt", "")
    return Card(
        name=data.get("name", ""),
        description=data.get("description", ""),
        system_prompt=data.get("system_prompt", ""),
        mes_example=data.get("mes_example", ""),
        post_history_instructions=data.get("post_history_instructions", ""),
        depth_prompt=depth or "",
        first_mes=data.get("first_mes", ""),
    )


def load_lorebook(path: Path) -> list[LoreEntry]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    entries = raw.get("entries", raw)
    # SillyTavern exports entries as a dict keyed by uid; some tools write a list.
    items = entries.values() if isinstance(entries, dict) else entries
    out: list[LoreEntry] = []
    for i, e in enumerate(items):
        keys = e.get("key", e.get("keys", [])) or []
        if isinstance(keys, str):
            keys = [k.strip() for k in keys.split(",") if k.strip()]
        out.append(
            LoreEntry(
                uid=str(e.get("uid", i)),
                comment=e.get("comment", "") or "",
                content=e.get("content", "") or "",
                keys=[str(k) for k in keys],
                constant=bool(e.get("constant", False)),
                order=int(e.get("order", e.get("insertion_order", 100)) or 0),
                disabled=bool(e.get("disable", False) or e.get("enabled") is False),
            )
        )
    return out


def select_entries(entries: list[LoreEntry], request_text: str) -> list[LoreEntry]:
    """Constant entries first (by order), then entries whose keyword occurs in the request."""
    live = [e for e in entries if not e.disabled]
    constant = sorted((e for e in live if e.constant), key=lambda e: e.order)
    haystack = fold(request_text)
    keyed = sorted(
        (e for e in live if not e.constant and any(k.strip() and fold(k.strip()) in haystack for k in e.keys)),
        key=lambda e: e.order,
    )
    return constant + keyed


def find_entry(entries: list[LoreEntry], title: str) -> LoreEntry | None:
    """An entry by its comment (title), ignoring case; exact match preferred, then containment."""
    t = fold(title)
    for e in entries:
        if fold(e.comment.strip()) == t:
            return e
    for e in entries:
        if t in fold(e.comment):
            return e
    return None


_QUOTED = re.compile(r"[\"“”«»'‘’]([^\"“”«»'‘’\n]{2,40})[\"“”«»'‘’]")


def forbidden_words(entry: LoreEntry | None) -> list[str]:
    """Pull the forbidden word list out of the language-rules entry.

    Quoted items anywhere in the entry are taken first. Lines that say "yasak" or
    "kullanılmaz" and hold a colon-separated list ("… KULLANILMAZ (…): a, b, c") are also
    read; parenthesised notes inside the list ("problem (bunun yerine: dert)") are the
    allowed alternatives and are dropped. The result is shown in --dry-run so the
    extraction can be checked against the real file.
    """
    if entry is None:
        return []
    found: list[str] = [m.group(1).strip() for m in _QUOTED.finditer(entry.content)]
    for line in entry.content.splitlines():
        head = fold(line.split(":", 1)[0])
        if ("yasak" in head or "kullanılmaz" in head) and ":" in line:
            tail = re.sub(r"\([^)]*\)", "", line.split(":", 1)[1])
            for part in re.split(r"[,;/]| - ", tail):
                part = part.strip(" .\t*-–•")
                if part and len(part) <= 40 and not _QUOTED.search(part):
                    found.append(part)
    seen: set[str] = set()
    out: list[str] = []
    for w in found:
        k = fold(w)
        if k and k not in seen:
            seen.add(k)
            out.append(w)
    return out


def reserved_names(entries: list[LoreEntry], title_prefix: str = "Karakter") -> set[str]:
    """Names of the main story's characters: the keys of entries titled "Karakter · …"."""
    p = fold(title_prefix)
    names: set[str] = set()
    for e in entries:
        if fold(e.comment.strip()).startswith(p):
            names.update(k.strip() for k in e.keys if k.strip())
    return names


def author_note(path: Path, section_title: str) -> str:
    """The [ … ] note under the numbered heading that contains `section_title`."""
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8")
    t = fold(section_title)
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if t in fold(line):
            rest = "\n".join(lines[i + 1 :])
            m = re.search(r"\[[^\[\]]*\]", rest, flags=re.S)
            return m.group(0).strip() if m else ""
    return ""
