"""Small Turkish-aware text helpers shared by the parser, checks and sources."""

from __future__ import annotations

import re

_TR_UPPER = str.maketrans({"İ": "i", "I": "ı"})
_CIRCUMFLEX = str.maketrans({"â": "a", "î": "i", "û": "u", "Â": "a", "Î": "i", "Û": "u"})
WORD_RE = re.compile(r"[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’]+")


def fold(text: str) -> str:
    """Lower-case with Turkish dotted/dotless i rules and without circumflexes."""
    return text.translate(_TR_UPPER).lower().translate(_CIRCUMFLEX)


def words(text: str) -> list[str]:
    """Words for counting and matching; apostrophe suffixes stay attached."""
    return WORD_RE.findall(text)


def word_count(text: str) -> int:
    return len(words(text))
