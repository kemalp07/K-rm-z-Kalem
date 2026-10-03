"""Parses the model's fixed-format letter into fields and segments.

Expected shape (labels at line start, in this order; NOT is optional):

    BAŞLIK: …
    HİTAP: …
    GÖVDE:
    …paragraphs…
    KAPANIŞ: …
    İMZA: … (mühür: İsim)
    NOT: …
    ZARF: …

Text inside ⟦ ⟧ is information the censor should catch: it becomes a "sensitive"
segment in the body, or flags the header / note / envelope as sensitive.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .text import fold

FIELDS = ["BAŞLIK", "HİTAP", "GÖVDE", "KAPANIŞ", "İMZA", "NOT", "ZARF"]
REQUIRED = ["BAŞLIK", "HİTAP", "GÖVDE", "KAPANIŞ", "İMZA", "ZARF"]
_FOLDED = {fold(f): f for f in FIELDS}
_LABEL_RE = re.compile(r"^[\s*#_]*([A-Za-zÇĞİÖŞÜçğıöşüİ]+)[\s*_]*:[\s*_]*(.*)$")
_SEAL_RE = re.compile(r"\(\s*mühür\s*:\s*([^)]+?)\s*\)", re.IGNORECASE)
_OPEN, _CLOSE = "⟦", "⟧"

# A full stop after these does not end a sentence.
_ABBREVIATIONS = {"ef", "efd", "hz", "sn", "no", "nr", "vs", "mah", "sok", "kz", "s", "bnb", "yzb", "çvş"}


class ParseError(ValueError):
    pass


@dataclass
class Marked:
    text: str
    sensitive: bool


@dataclass
class Segment:
    id: str
    text: str
    kind: str  # "normal" | "sensitive"
    para: int


@dataclass
class ParsedLetter:
    header: Marked
    salutation: str
    segments: list[Segment]
    closing: str
    signature: str
    seal: str | None
    note: Marked | None
    envelope: Marked
    raw: str = ""
    fields: dict[str, str] = field(default_factory=dict)


def _split_fields(raw: str) -> dict[str, str]:
    text = raw.replace("\r\n", "\n").strip()
    # Some models wrap the answer in a code fence.
    text = re.sub(r"^```[a-zA-Z]*\n|\n```$", "", text).strip()
    found: dict[str, list[str]] = {}
    current: str | None = None
    preamble: list[str] = []
    for line in text.split("\n"):
        m = _LABEL_RE.match(line)
        label = _FOLDED.get(fold(m.group(1))) if m else None
        if label:
            if label in found:
                raise ParseError(f"{label} alanı iki kez var")
            current = label
            found[label] = [m.group(2)]
        elif current is None:
            if line.strip():
                preamble.append(line)
        else:
            found[current].append(line)
    if preamble:
        raise ParseError(f"alanlardan önce açıklama metni var: {preamble[0][:60]!r}")
    missing = [f for f in REQUIRED if f not in found]
    if missing:
        raise ParseError("eksik alan: " + ", ".join(missing))
    order = [f for f in FIELDS if f in found]
    seen = [f for f in found]
    if seen != order:
        raise ParseError("alanların sırası bozuk: " + ", ".join(seen))

    values = {k: "\n".join(v).strip() for k, v in found.items()}
    # The envelope is last: anything after a blank line following it is commentary.
    env = values["ZARF"].split("\n\n")
    if len(env) > 1 and any(p.strip() for p in env[1:]):
        raise ParseError(f"ZARF'tan sonra fazladan metin var: {env[1].strip()[:60]!r}")
    values["ZARF"] = env[0].strip()
    for k, v in values.items():
        if not v and k != "NOT":
            raise ParseError(f"{k} alanı boş")
    return values


def _check_marks(text: str, where: str) -> None:
    depth = 0
    for ch in text:
        if ch == _OPEN:
            depth += 1
            if depth > 1:
                raise ParseError(f"{where}: iç içe ⟦ ⟧")
        elif ch == _CLOSE:
            depth -= 1
            if depth < 0:
                raise ParseError(f"{where}: açılmamış ⟧")
    if depth != 0:
        raise ParseError(f"{where}: kapanmamış ⟦")


def _no_stage_directions(text: str, where: str) -> None:
    if re.search(r"\*[^*\n]+\*", text) or "*" in text:
        raise ParseError(f"{where}: yıldızlı eylem/biçimlendirme var")


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace(_OPEN, "").replace(_CLOSE, "")).strip()


def _marked(text: str, where: str) -> Marked:
    _check_marks(text, where)
    return Marked(text=_clean(text), sensitive=_OPEN in text)


def split_sentences(text: str) -> list[str]:
    """Sentences of a paragraph; keeps abbreviations ("Ef.", "S.") inside their sentence."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    out: list[str] = []
    start = 0
    for m in re.finditer(r"[.!?…]+[\"”»')]*\s+(?=[\"“«(]?[A-ZÇĞİÖŞÜÂÎÛ0-9])", text):
        before = text[start : m.start()].split()
        last = before[-1] if before else ""
        if text[m.start()] == "." and fold(last.strip("\"“«(")) in _ABBREVIATIONS:
            continue
        out.append(text[start : m.end()].strip())
        start = m.end()
    tail = text[start:].strip()
    if tail:
        out.append(tail)
    return out


def body_segments(body: str) -> list[Segment]:
    _check_marks(body, "GÖVDE")
    paragraphs = [p for p in re.split(r"\n\s*\n", body.strip()) if p.strip()]
    segments: list[Segment] = []
    for pi, para in enumerate(paragraphs):
        flat = re.sub(r"\s+", " ", para).strip()
        # Alternate plain / marked pieces; marked pieces stand alone, plain ones are split
        # into sentences. A mark inside a sentence splits that sentence around it.
        for i, piece in enumerate(re.split(r"⟦|⟧", flat)):
            piece = piece.strip()
            if not piece:
                continue
            if i % 2 == 1:
                segments.append(Segment(id="", text=piece, kind="sensitive", para=pi))
            else:
                for sentence in split_sentences(piece):
                    segments.append(Segment(id="", text=sentence, kind="normal", para=pi))
    for n, s in enumerate(segments, 1):
        s.id = f"s{n}"
    if not segments:
        raise ParseError("GÖVDE boş")
    return segments


def parse(raw: str) -> ParsedLetter:
    values = _split_fields(raw)
    for name in ("HİTAP", "GÖVDE", "KAPANIŞ", "İMZA", "BAŞLIK", "NOT", "ZARF"):
        if name in values:
            _no_stage_directions(values[name], name)
    signature = values["İMZA"]
    seal_m = _SEAL_RE.search(signature)
    seal = seal_m.group(1).strip() if seal_m else None
    signature = _clean(_SEAL_RE.sub("", signature))
    note = values.get("NOT", "").strip()
    return ParsedLetter(
        header=_marked(values["BAŞLIK"], "BAŞLIK"),
        salutation=_clean(values["HİTAP"]),
        segments=body_segments(values["GÖVDE"]),
        closing=_clean(values["KAPANIŞ"]),
        signature=signature,
        seal=seal,
        note=_marked(note, "NOT") if note and fold(note) not in ("yok", "-", "—") else None,
        envelope=_marked(values["ZARF"].replace("\n", ", "), "ZARF"),
        raw=raw,
        fields=values,
    )
