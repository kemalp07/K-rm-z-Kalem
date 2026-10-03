"""Rule-based checks run on every parsed letter before any model reviews it.

Each check returns {"result": "pass" | "warn" | "fail", "detail": "…"}; any fail rejects.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .record import body_text
from .text import fold, words

PASS, WARN, FAIL = "pass", "warn", "fail"

# Words that may follow "Ordu-yı Hümayun" in a header without naming a place.
_HEADER_OK = {
    fold(w)
    for w in """Hümayun Hümayunu Sene Rumi Hicri Kânunusani Kanunusani Şubat Mart Nisan Mayıs Haziran Temmuz
    Ağustos Eylül Teşrinievvel Teşrinisani Kânunuevvel Kanunuevvel Pazar Pazartesi Salı Çarşamba Perşembe
    Cuma Cumartesi""".split()
}
_MILITARY_WORDS = ["alay", "tabur", "bölük", "bölüğ", "fırka", "kolordu", "ordu", "müfreze", "batarya", "takım"]
# The lorebook: a military address goes by unit only, never by place.
_FRONT_PLACES = ["çanakkale", "cephe", "arıburnu", "seddülbahir", "anafarta", "kilitbahir", "gelibolu", "kafkas"]
_HOME_WORDS = ["köy", "karye", "nahiye", "kaza", "mahalle", "sokağ", "sokak", "cadde", "çarşı", "hane", "kasaba", "şehr", "vilayet", "sancak"]
_ORDINALS = r"(birinci|ikinci|üçüncü|dördüncü|beşinci|altıncı|yedinci|sekizinci|dokuzuncu|onuncu)"
_NARRATOR = [
    r"\bdiye (yazdı|ekledi|bitirdi|söyledi|fısıldadı)\b",
    r"\b(kalemi|kalemini) (bıraktı|aldı|eline aldı)\b",
    r"\bmektubu (katladı|bitirdi|zarfa koydu|mühürledi)\b",
    r"\bimzasını (attı|bastı)\b",
]


def result(r: str, detail: str = "") -> dict[str, str]:
    return {"result": r, "detail": detail}


@dataclass
class CheckContext:
    forbidden: list[str]
    low_literacy_words: list[str]
    length_warn: float = 0.30
    length_fail: float = 0.50
    repeat_ngram: int = 6
    military_header_prefix: str = "Ordu-yı Hümayun"
    # (letter id, body text) of the other letters in the pool, for the repetition check.
    others: list[tuple[str, str]] = field(default_factory=list)


def _matches(text: str, terms: list[str]) -> list[str]:
    """Terms found in text. Long single words also match with suffixes ("hissetmek" → "hissediyorum"
    does not, but "kelam" → "kelamı" does); short words and phrases must match whole."""
    folded = fold(text)
    tokens = [fold(w) for w in words(text)]
    hits = []
    for term in terms:
        t = fold(term.strip())
        if not t:
            continue
        if " " in t:
            if re.search(r"(?<!\w)" + re.escape(t) + r"(?!\w)", folded):
                hits.append(term)
        elif len(t) >= 5:
            if any(tok.startswith(t) for tok in tokens):
                hits.append(term)
        elif t in tokens:
            hits.append(term)
    return hits


def _all_text(rec: dict[str, Any]) -> str:
    parts = [
        (rec.get("header") or {}).get("text", ""),
        rec.get("salutation") or "",
        body_text(rec),
        rec.get("closing") or "",
        (rec.get("note") or {}).get("text", ""),
    ]
    return "\n".join(parts)


def check_format(rec: dict[str, Any]) -> dict[str, str]:
    if rec.get("parse_error"):
        return result(FAIL, rec["parse_error"])
    return result(PASS)


def check_length(rec: dict[str, Any], ctx: CheckContext) -> dict[str, str]:
    target = rec.get("length_target") or 0
    n = len(words(body_text(rec)))
    if not target:
        return result(PASS, f"{n} kelime")
    off = abs(n - target) / target
    detail = f"{n} kelime, hedef {target} ({(n - target) / target:+.0%})"
    if off > ctx.length_fail:
        return result(FAIL, detail)
    if off > ctx.length_warn:
        return result(WARN, detail)
    return result(PASS, detail)


def check_forbidden(rec: dict[str, Any], ctx: CheckContext) -> dict[str, str]:
    if not ctx.forbidden:
        return result(WARN, "yasak kelime listesi lorebook'tan okunamadı")
    hits = _matches(_all_text(rec), ctx.forbidden)
    return result(FAIL, "geçen: " + ", ".join(hits)) if hits else result(PASS)


def check_literacy_words(rec: dict[str, Any], ctx: CheckContext) -> dict[str, str]:
    # Only a barely literate person writing in their own hand. Whoever writes a letter down
    # for someone else (comrade, imam, scribe) mixes in their own words, as the card says.
    applies = rec["literacy"] == "low" and rec["writes"] == "self"
    if not applies:
        return result(PASS, "uygulanmadı")
    hits = _matches(_all_text(rec), ctx.low_literacy_words)
    return result(FAIL, "geçen: " + ", ".join(hits)) if hits else result(PASS)


def check_narrator(rec: dict[str, Any]) -> dict[str, str]:
    text = "\n".join([rec.get("salutation") or "", body_text(rec), rec.get("closing") or ""])
    problems = []
    if "*" in text:
        problems.append("yıldız işareti")
    paren = re.findall(r"\(([^)]*)\)", text)
    if paren:
        problems.append("parantez: (" + paren[0][:30] + ")")
    for pat in _NARRATOR:
        m = re.search(pat, fold(text))
        if m:
            problems.append(f"anlatıcı cümlesi: {m.group(0)!r}")
    return result(FAIL, "; ".join(problems)) if problems else result(PASS)


def expected_sensitive(carelessness: str) -> tuple[int, int]:
    return {"none": (0, 0), "low": (1, 1), "high": (2, 3)}.get(carelessness, (0, 3))


def check_sensitive_balance(rec: dict[str, Any]) -> dict[str, str]:
    # A slip can sit anywhere the card allows one: body, header (the place), note, envelope.
    n = sum(1 for s in rec.get("segments", []) if s["kind"] == "sensitive")
    n += sum(1 for k in ("header", "note", "envelope") if (rec.get(k) or {}).get("sensitive"))
    info = (rec["meta"].get("request_fields") or {}).get("sensitive_info", "yok")
    if fold(str(info)) != "yok":
        return result(PASS if n >= 1 else WARN, f"{n} hassas parça; istekte hassas bilgi verilmişti")
    lo, hi = expected_sensitive(rec["carelessness"])
    detail = f"{n} hassas parça, dikkatsizlik '{rec['carelessness']}' için beklenen {lo}" + (f"–{hi}" if hi != lo else "")
    return result(PASS if lo <= n <= hi else WARN, detail)


def check_header(rec: dict[str, Any], ctx: CheckContext) -> dict[str, str]:
    if rec["direction"] != "cepheden":
        return result(PASS, "uygulanmadı")
    header = rec.get("header") or {}
    text = header.get("text", "")
    squash = lambda s: re.sub(r"[\s\-]", "", fold(s))  # noqa: E731
    prefix = ctx.military_header_prefix
    if not squash(text).startswith(squash(prefix)):
        # The card's own example for "az" heads the letter with the place, marked: a slip
        # the censor should catch, not a format error.
        if header.get("sensitive"):
            return result(PASS, f"yer adı başlıkta, ⟦ ⟧ içinde: {text[:50]!r}")
        return result(FAIL, f"başlık {prefix!r} ile başlamıyor: {text[:50]!r}")
    # Drop the prefix (whatever its spacing) and look for capitalised words that are not dates.
    rest = text
    for i in range(len(text) + 1):
        if squash(text[:i]) == squash(prefix):
            rest = text[i:]
            break
    places = [w for w in words(rest) if w[:1].isupper() and fold(w.strip("'’")) not in _HEADER_OK]
    if places and not header.get("sensitive"):
        return result(FAIL, "başlıkta işaretsiz yer adı: " + ", ".join(places[:3]))
    return result(PASS)


def check_envelope(rec: dict[str, Any]) -> dict[str, str]:
    env = (rec.get("envelope") or {}).get("text", "")
    f = fold(env)
    military = rec["direction"] == "cepheye"
    if military:
        stripped = re.sub(r"\[\s*\.{2,3}\s*\]", "", env)
        if re.search(r"\d", stripped) or re.search(_ORDINALS + r"\s+(alay|tabur|bölü|fırka|kolordu)", fold(stripped)):
            return result(FAIL, f"askerî adreste uydurulmuş birlik numarası: {env[:70]!r}")
        places = [w for w in _FRONT_PLACES if w in f]
        if places:
            return result(FAIL, "askerî adreste yer adı (yalnız birlik yazılır): " + ", ".join(places))
        if not any(w in f for w in _MILITARY_WORDS):
            return result(WARN, f"askerî adres kalıbına benzemiyor: {env[:70]!r}")
        return result(PASS)
    if not any(w in f for w in _HOME_WORDS):
        return result(WARN, f"köy/şehir adres kalıbına benzemiyor: {env[:70]!r}")
    return result(PASS)


def check_date(rec: dict[str, Any]) -> dict[str, str]:
    want = (rec["meta"].get("request_fields") or {}).get("date")
    if not want:
        return result(PASS, "uygulanmadı")
    header = fold((rec.get("header") or {}).get("text", ""))
    day, month, _ = want.split(" ")
    if re.search(rf"(?<!\d){day}(?!\d)", header) and fold(month) in header:
        return result(PASS)
    return result(WARN, f"başlıktaki tarih istekteki {want!r} değil: {(rec.get('header') or {}).get('text', '')[:50]!r}")


def check_seal(rec: dict[str, Any]) -> dict[str, str]:
    if rec["literacy"] != "none":
        return result(PASS, "uygulanmadı")
    if (rec.get("signature") or {}).get("seal"):
        return result(PASS)
    return result(FAIL, "okuma yazma bilmeyen gönderenin imzasında mühür yok")


def check_repetition(rec: dict[str, Any], ctx: CheckContext) -> dict[str, str]:
    n = ctx.repeat_ngram
    mine = [fold(w) for w in words(body_text(rec))]
    grams = {tuple(mine[i : i + n]) for i in range(len(mine) - n + 1)}
    if not grams:
        return result(PASS)
    for other_id, text in ctx.others:
        if other_id == rec["id"]:
            continue
        theirs = [fold(w) for w in words(text)]
        for i in range(len(theirs) - n + 1):
            g = tuple(theirs[i : i + n])
            if g in grams:
                return result(WARN, f"{other_id} ile ortak: \"{' '.join(g)}\"")
    return result(PASS)


def run_all(rec: dict[str, Any], ctx: CheckContext) -> dict[str, dict[str, str]]:
    checks = {"format": check_format(rec)}
    if rec.get("parse_error"):
        return checks
    checks.update(
        length=check_length(rec, ctx),
        forbidden=check_forbidden(rec, ctx),
        literacy_words=check_literacy_words(rec, ctx),
        narrator=check_narrator(rec),
        sensitive_balance=check_sensitive_balance(rec),
        header=check_header(rec, ctx),
        envelope=check_envelope(rec),
        date=check_date(rec),
        seal=check_seal(rec),
        repetition=check_repetition(rec, ctx),
    )
    return checks


def failed(checks: dict[str, dict[str, str]]) -> list[str]:
    return [k for k, v in checks.items() if v["result"] == FAIL]


# Turkish names for the report.
CHECK_NAMES = {
    "format": "Biçim",
    "length": "Uzunluk",
    "forbidden": "Yasak kelimeler",
    "literacy_words": "Okuryazarlık kelimeleri",
    "narrator": "Anlatıcı izi",
    "sensitive_balance": "Hassas bilgi dengesi",
    "header": "Asker başlığı",
    "envelope": "Zarf adresi",
    "date": "Tarih",
    "seal": "Mühür",
    "repetition": "Tekrar",
}
