"""Command line: generate, review, promote, reject, stats, export."""

from __future__ import annotations

import asyncio
import random
from enum import Enum
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from . import pipeline, record as record_mod, report
from .config import ROOT, ensure_credentials, load_settings, missing_model_env, model_env
from .export import export as export_letters
from .llm import GenaiModel, Runner, Usage
from .store import Pool

app = typer.Typer(add_completion=False, help="Kırmızı Kalem yan mektup havuzu üretici.")
console = Console()
_POOL: dict[str, Path | None] = {"dir": None}


@app.callback()
def main(pool: Path = typer.Option(None, "--pool", help="Havuz klasörü (varsayılan: pool/; denemeler için ör. trials/round1)")) -> None:
    _POOL["dir"] = pool


def _pool(settings) -> Pool:
    return Pool(settings.path(str(_POOL["dir"])) if _POOL["dir"] else settings.pool_dir)


class Direction(str, Enum):
    cepheden = "cepheden"
    cepheye = "cepheye"
    mixed = "mixed"


def _fail(msg: str) -> None:
    console.print(f"[bold red]Hata:[/] {msg}")
    raise typer.Exit(1)


def _sources(settings):
    try:
        return pipeline.load_sources(settings)
    except pipeline.SourceError as e:
        _fail(f"{e}\nKart ve lorebook dosyalarını tools/letter-gen/source/ altına koy (yollar config.yaml'da).")


def _usage_line(label: str, u: Usage, price_in: float, price_out: float) -> str:
    cost = f"≈ ${u.cost(price_in, price_out):.4f}" if (price_in or price_out) else "maliyet: fiyat girilmedi"
    return f"{label}: {u.calls} çağrı, {u.input:,} girdi + {u.output:,} çıktı token, {cost}"


def _write_report(pool: Pool, summary: str = "") -> Path:
    records = list(pool.all())
    pool.write_index()
    path = pool.root / "report.md"
    path.write_text(report.build(records, summary), encoding="utf-8")
    return path


def _runner(settings, env) -> Runner:
    g = settings.config["generation"]
    ensure_credentials()
    return Runner(GenaiModel(env.project, env.location), concurrency=g["concurrency"], retries=g["retries"])


@app.command()
def generate(
    count: int = typer.Option(..., "--count", "-n", min=1, help="Kaç mektup üretilecek"),
    direction: Direction = typer.Option(Direction.mixed, "--direction", "-d"),
    seed: int = typer.Option(None, "--seed", help="Aynı seed + aynı havuz durumu = aynı istekler"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Modele gitme; istekleri ve bir prompt örneğini göster"),
    no_review: bool = typer.Option(False, "--no-review", help="Eleştirmeni çalıştırma"),
) -> None:
    """Mektup üret, kontrol et ve (varsayılan olarak) eleştirmene incelet."""
    settings = load_settings(ROOT)
    src = _sources(settings)
    pool = _pool(settings)
    seed = seed if seed is not None else random.randrange(1, 10**9)

    if src.unknown_labels:
        console.print(f"[yellow]Kartta pools.yaml'da eşlemesi olmayan istek etiketleri:[/] {', '.join(src.unknown_labels)}")
    planned = pipeline.plan(settings, src, pool, count, direction.value, seed)

    if dry_run:
        t = Table(title=f"{count} istek (seed {seed})", show_lines=False)
        for col in ("id", "gönderen", "alıcı", "yazma", "okuryazar", "dikkat", "konu", "uzunluk"):
            t.add_column(col)
        for p in planned:
            r = p.request
            t.add_row(
                p.id,
                f"{r.sender.epithet} {r.sender.name} ({r.sender.age})",
                f"{r.recipient.name} ({r.recipient.relation or r.soldier_relation}, {r.recipient.age})",
                r.writes,
                r.literacy,
                r.carelessness,
                r.topic[:28],
                str(r.length_target),
            )
        console.print(t)
        console.print(f"Yasak kelimeler (lorebook'tan {len(src.forbidden)}): {', '.join(src.forbidden) or '— okunamadı'}")
        console.print(f"İstek etiketleri: {', '.join(src.labels)}")
        p = planned[0]
        console.print(Panel(p.prompt.as_text(), title=f"Örnek prompt — {p.id} (lorebook: {', '.join(p.prompt.lore_used) or '—'})"))
        return

    ensure_credentials()
    env = model_env()
    missing = missing_model_env(env, need_review=not no_review)
    if missing:
        _fail("ortam değişkenleri eksik: " + ", ".join(missing) + " (.env.example'a bak)")

    runner = _runner(settings, env)
    with console.status(f"{count} mektup üretiliyor…"):
        res = asyncio.run(pipeline.generate(settings, src, pool, planned, runner, env.gen_model, seed, progress=console.print))
    summary = [f"Seed {seed}. " + _usage_line("Üretim", res.gen_usage, env.price_gen_in, env.price_gen_out)]

    if not no_review:
        rrunner = _runner(settings, env)
        ids = [r["id"] for r in res.records]
        with console.status("Eleştirmen inceliyor…"):
            rres = asyncio.run(pipeline.review_pending(settings, src, pool, rrunner, env.review_model, only=ids, progress=console.print))
        res.errors += rres.errors
        summary.append(_usage_line("İnceleme", rres.review_usage, env.price_review_in, env.price_review_out))

    for e in res.errors:
        console.print(f"[red]✗ {e}[/]")
    path = _write_report(pool, "\n\n".join(summary))
    final = [pool.load(r["id"]) for r in res.records]
    counts = {s: sum(1 for r in final if r and r["status"] == s) for s in ("accepted", "needs_review", "rejected")}
    console.print("\n".join(summary))
    console.print(f"Sonuç: {counts['accepted']} kabul, {counts['needs_review']} elle bakılacak, {counts['rejected']} red. Rapor: {path}")


@app.command()
def review(
    redo: bool = typer.Option(False, "--redo", help="Kontrolleri yeniden çalıştır ve elle karar verilmemiş her mektubu yeniden incelet"),
) -> None:
    """Henüz eleştirmenden geçmemiş mektupları incelet."""
    settings = load_settings(ROOT)
    src = _sources(settings)
    ensure_credentials()
    env = model_env()
    missing = missing_model_env(env, need_review=True)
    if missing:
        _fail("ortam değişkenleri eksik: " + ", ".join(missing))
    pool = _pool(settings)
    if redo:
        console.print(f"{pipeline.recheck(settings, src, pool)} mektup yeniden kontrol edildi.")
    runner = _runner(settings, env)
    res = asyncio.run(pipeline.review_pending(settings, src, pool, runner, env.review_model, progress=console.print))
    for e in res.errors:
        console.print(f"[red]✗ {e}[/]")
    line = _usage_line("İnceleme", res.review_usage, env.price_review_in, env.price_review_out)
    path = _write_report(pool, line)
    console.print(f"{len(res.records)} mektup incelendi. {line}. Rapor: {path}")


def _move(letter_id: str, status: str, note: str) -> None:
    settings = load_settings(ROOT)
    pool = _pool(settings)
    rec = pool.load(letter_id)
    if not rec:
        _fail(f"{letter_id} bulunamadı")
    record_mod.set_status(rec, status, "manual", note)
    pool.save(rec)
    _write_report(pool)
    console.print(f"{letter_id} → {status}")


@app.command()
def promote(letter_id: str, note: str = typer.Option("", "--note", help="Neden")) -> None:
    """Mektubu elle kabul et."""
    _move(letter_id, "accepted", note)


@app.command()
def reject(letter_id: str, note: str = typer.Option("", "--note", help="Neden")) -> None:
    """Mektubu elle reddet."""
    _move(letter_id, "rejected", note)


@app.command()
def stats() -> None:
    """Havuzun genel dağılımı."""
    settings = load_settings(ROOT)
    pool = _pool(settings)
    records = list(pool.all())
    if not records:
        console.print("Havuz boş.")
        return
    console.print("\n".join(report.stats_md(records)))


@app.command()
def export(out: Path = typer.Option(None, "--out", help="Oyunun içerik dosyası")) -> None:
    """Yalnızca kabul edilmiş mektupları oyunun içerik dosyasına yaz."""
    settings = load_settings(ROOT)
    pool = _pool(settings)
    target = out or settings.path(settings.config["export"]["out"])
    n = export_letters(list(pool.all()), target)
    console.print(f"{n} mektup → {target}")


if __name__ == "__main__":
    app()
