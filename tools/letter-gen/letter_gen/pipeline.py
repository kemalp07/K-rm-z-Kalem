"""Generate → parse → check → review, kept free of CLI concerns so tests can drive it."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Callable

from . import checks as checks_mod
from . import prompt as prompt_mod
from . import record as record_mod
from . import request_text, review as review_mod
from .config import Settings
from .llm import Runner, Usage
from .parser import ParseError, parse
from .sampler import Request, Sampler
from .sources import Card, LoreEntry, find_entry, forbidden_words, load_card, load_lorebook
from .store import Pool


class SourceError(RuntimeError):
    pass


@dataclass
class Sources:
    card: Card
    lore: list[LoreEntry]
    forbidden: list[str]
    labels: list[str]
    unknown_labels: list[str]


def load_sources(settings: Settings) -> Sources:
    missing = [p for p in (settings.card_path, settings.lorebook_path) if not p.exists()]
    if missing:
        raise SourceError("kaynak dosya bulunamadı: " + ", ".join(str(p) for p in missing))
    card = load_card(settings.card_path)
    lore = load_lorebook(settings.lorebook_path)
    cfg = settings.config["checks"]
    words = forbidden_words(find_entry(lore, cfg["forbidden_entry_title"])) + list(cfg.get("extra_forbidden") or [])
    labels, unknown = request_text.label_order(settings.pools, card.mes_example)
    return Sources(card=card, lore=lore, forbidden=words, labels=labels, unknown_labels=unknown)


@dataclass
class Planned:
    id: str
    request: Request
    text: str
    prompt: prompt_mod.Prompt


def plan(settings: Settings, src: Sources, pool: Pool, count: int, direction: str, seed: int) -> list[Planned]:
    sampler = Sampler(
        settings.pools,
        seed=seed,
        name_max_uses=settings.config["sampler"]["name_max_uses"],
        used_names=pool.name_uses(),
    )
    requests = sampler.batch(count, direction)
    ids = pool.next_ids([r.direction for r in requests])
    user_name = (settings.config.get("macros") or {}).get("user") or "Kullanıcı"
    out = []
    for letter_id, req in zip(ids, requests):
        text = request_text.render(req, settings.pools, src.labels)
        out.append(Planned(letter_id, req, text, prompt_mod.build(src.card, src.lore, text, user_name)))
    return out


def check_context(settings: Settings, src: Sources, others: list[tuple[str, str]]) -> checks_mod.CheckContext:
    c = settings.config["checks"]
    return checks_mod.CheckContext(
        forbidden=src.forbidden,
        low_literacy_words=list(c["low_literacy_words"]),
        length_warn=c["length_warn"],
        length_fail=c["length_fail"],
        repeat_ngram=c["repeat_ngram"],
        military_header_prefix=c["military_header_prefix"],
        others=others,
    )


def apply_checks(rec: dict[str, Any], ctx: checks_mod.CheckContext) -> None:
    rec["checks"] = checks_mod.run_all(rec, ctx)
    bad = checks_mod.failed(rec["checks"])
    if bad:
        record_mod.set_status(rec, "rejected", "auto", "kontrol: " + ", ".join(bad))
    else:
        record_mod.set_status(rec, "needs_review", "auto", "kontroller geçti, eleştirmen bekleniyor")


@dataclass
class RunResult:
    records: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    gen_usage: Usage = field(default_factory=Usage)
    review_usage: Usage = field(default_factory=Usage)


async def generate(
    settings: Settings,
    src: Sources,
    pool: Pool,
    planned: list[Planned],
    runner: Runner,
    model_name: str,
    seed: int,
    progress: Callable[[str], None] = lambda _: None,
) -> RunResult:
    g = settings.config["generation"]
    res = RunResult()

    async def one(p: Planned):
        try:
            reply = await runner.call(
                model=model_name,
                system=p.prompt.system,
                turns=p.prompt.turns + [("user", p.prompt.user)],
                temperature=g["temperature"],
                max_output_tokens=g["max_output_tokens"],
            )
        except Exception as e:  # noqa: BLE001 — recorded and reported, the batch goes on
            progress(f"✗ {p.id}: {e}")
            return p, None, str(e)
        progress(f"✓ {p.id}")
        return p, reply, None

    results = await asyncio.gather(*(one(p) for p in planned))

    # Checks run in request order so the repetition check sees earlier letters of this batch.
    others = [(r["id"], record_mod.body_text(r)) for r in pool.all() if r["status"] != "rejected"]
    for p, reply, err in results:
        if err:
            res.errors.append(f"{p.id}: {err}")
            continue
        meta = {
            "seed": seed,
            "model": model_name,
            "createdAt": record_mod.now(),
            "tokens": reply.usage.to_dict(),
            "attempts": reply.attempts,
            "lore": p.prompt.lore_used,
            "raw": reply.text,
        }
        try:
            parsed, perr = parse(reply.text), None
        except ParseError as e:
            parsed, perr = None, str(e)
        rec = record_mod.build(p.id, p.request, p.text, parsed, meta, parse_error=perr)
        apply_checks(rec, check_context(settings, src, others))
        if rec["status"] != "rejected":
            others.append((rec["id"], record_mod.body_text(rec)))
        pool.save(rec)
        res.records.append(rec)
    res.gen_usage = runner.usage
    return res


async def review_pending(
    settings: Settings,
    src: Sources,
    pool: Pool,
    runner: Runner,
    model_name: str,
    only: list[str] | None = None,
    progress: Callable[[str], None] = lambda _: None,
) -> RunResult:
    r = settings.config["review"]
    res = RunResult()
    todo = [
        rec
        for rec in pool.all()
        if rec["status"] == "needs_review" and not rec.get("review") and (only is None or rec["id"] in only)
    ]
    system = review_mod.system_prompt(src.card, src.lore)

    async def one(rec: dict[str, Any]):
        try:
            reply = await runner.call(
                model=model_name,
                system=system,
                turns=[("user", review_mod.user_prompt(rec))],
                temperature=r["temperature"],
                max_output_tokens=r["max_output_tokens"],
                json_schema=review_mod.SCHEMA,
            )
            data = review_mod.parse_reply(reply.text)
        except Exception as e:  # noqa: BLE001
            progress(f"✗ inceleme {rec['id']}: {e}")
            return rec, None, None, str(e)
        progress(f"✓ inceleme {rec['id']}")
        return rec, data, reply, None

    for rec, data, reply, err in await asyncio.gather(*(one(x) for x in todo)):
        if err:
            res.errors.append(f"{rec['id']}: {err}")
            continue
        rec["review"] = {"model": model_name, "reviewed_at": record_mod.now(), "tokens": reply.usage.to_dict(), **data}
        status = review_mod.status_for(data["scores"], r["accept_min"], r["reject_max"])
        record_mod.set_status(rec, status, "auto", "eleştirmen")
        pool.save(rec)
        res.records.append(rec)
    res.review_usage = runner.usage
    return res
