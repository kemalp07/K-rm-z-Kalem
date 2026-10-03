"""Second model call: a critic scores each letter that passed the rule checks.

The critic never rewrites the letter; it scores six criteria, explains each in a
sentence and lists problem lines with a suggested fix.
"""

from __future__ import annotations

import json
from typing import Any

from .record import labelled
from .sources import Card, LoreEntry

CRITERIA = {
    "donem_dili": "Dönem dili: 1915 dili mi, modern ifade var mı",
    "olculuk": "Ölçülülük: duygular adlandırılıyor mu, abartı ya da metafor yığını var mı (az olması iyi)",
    "okuryazarlik": "Okuryazarlık uyumu: istekteki okuryazarlık ve yazma biçimine uyuyor mu",
    "somutluk": "Somutluk: gündelik, somut ayrıntılar var mı",
    "sadakat": "İsteğe sadakat: konu, saklanan şey, yön ve yazma biçimi istekteki gibi mi",
    "sahicilik": "Sahicilik: gerçek bir insanın mektubu gibi mi, yoksa klişe mi",
}

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "scores": {
            "type": "object",
            "properties": {k: {"type": "integer", "minimum": 1, "maximum": 5} for k in CRITERIA},
            "required": list(CRITERIA),
        },
        "reasons": {
            "type": "object",
            "properties": {k: {"type": "string"} for k in CRITERIA},
            "required": list(CRITERIA),
        },
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "line": {"type": "string"},
                    "problem": {"type": "string"},
                    "suggestion": {"type": "string"},
                },
                "required": ["line", "problem", "suggestion"],
            },
        },
    },
    "required": ["scores", "reasons", "issues"],
}


def system_prompt(card: Card, lore: list[LoreEntry]) -> str:
    rules = [card.system_prompt.strip()] + [e.content.strip() for e in sorted((e for e in lore if e.constant and not e.disabled), key=lambda e: e.order)]
    return (
        "Sen 1915 yılında yazılmış Osmanlı mektuplarını inceleyen titiz bir editörsün. "
        "Sana bir mektup isteği ve o isteğe göre yazılmış bir mektup verilecek. "
        "Mektubu DÜZELTME ve yeniden yazma; yalnızca puanla, gerekçe yaz ve sorunlu satırlar için öneri ver. "
        "Puanlar 1–5 arasıdır: 5 kusursuz, 4 iyi, 3 elle bakılmalı, 2 ve 1 kullanılamaz. Cömert olma. "
        "⟦ ⟧ işaretli yerler sansürcünün yakalaması gereken bilgilerdir; işaretlerin kendisi mektubun parçası değildir.\n\n"
        "Mektupların uyması gereken kurallar:\n\n" + "\n\n".join(r for r in rules if r)
    )


def user_prompt(rec: dict[str, Any]) -> str:
    criteria = "\n".join(f"- {k}: {v}" for k, v in CRITERIA.items())
    return (
        f"İSTEK:\n{rec['meta']['request']}\n\n"
        f"MEKTUP:\n{labelled(rec)}\n\n"
        "Şu ölçütleri 1–5 arası puanla ve her biri için tek cümlelik gerekçe yaz:\n"
        f"{criteria}\n\n"
        "Sonra sorunlu satırları listele: satırın kendisi (mektuptan aynen), sorun ve önerilen düzeltme. "
        "Sorun yoksa liste boş olsun. Yanıtı yalnızca JSON olarak ver."
    )


def parse_reply(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{") :]
    data = json.loads(text)
    scores = {k: int(data["scores"][k]) for k in CRITERIA}
    return {"scores": scores, "reasons": data.get("reasons", {}), "issues": data.get("issues", [])}


def status_for(scores: dict[str, int], accept_min: int = 4, reject_max: int = 2) -> str:
    values = list(scores.values())
    if any(v <= reject_max for v in values):
        return "rejected"
    if all(v >= accept_min for v in values):
        return "accepted"
    return "needs_review"
