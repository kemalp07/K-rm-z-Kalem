import asyncio
import json

import pytest

from conftest import GOOD_LETTER
from letter_gen import pipeline, review
from letter_gen.llm import Reply, Runner, TransientError, Usage
from letter_gen.store import Pool


class FakeModel:
    """Answers letter requests with a fixed letter and reviews with fixed scores."""

    def __init__(self, letter=GOOD_LETTER, scores=None, fail_first=0):
        self.letter = letter
        self.scores = scores or {k: 5 for k in review.CRITERIA}
        self.fail_first = fail_first
        self.calls = 0

    async def generate(self, *, model, system, turns, temperature, max_output_tokens, json_schema=None):
        self.calls += 1
        if self.calls <= self.fail_first:
            raise TransientError("429")
        if json_schema:
            body = {"scores": self.scores, "reasons": {k: "tamam" for k in self.scores}, "issues": []}
            return Reply(json.dumps(body), Usage(100, 20, 1))
        return Reply(self.letter, Usage(1000, 300, 1))


async def _no_sleep(_):
    return None


def _run(settings, model, count=4, direction="cepheden"):
    # The canned letter is short; ask for that length so the length check passes.
    settings.pools["lengths"] = [{"value": "kısa", "words": [28, 30], "weight": 1}]
    src = pipeline.load_sources(settings)
    pool = Pool(settings.pool_dir)
    planned = pipeline.plan(settings, src, pool, count, direction, seed=1)
    runner = Runner(model, concurrency=2, retries=3, sleep=_no_sleep)
    res = asyncio.run(pipeline.generate(settings, src, pool, planned, runner, "gen-model", 1))
    rres = asyncio.run(pipeline.review_pending(settings, src, pool, Runner(model, sleep=_no_sleep), "review-model"))
    return pool, res, rres


def test_generate_check_review_store(settings):
    pool, res, rres = _run(settings, FakeModel(), count=3)
    assert [r["id"] for r in res.records] == ["pool_cepheden_000001", "pool_cepheden_000002", "pool_cepheden_000003"]
    assert res.gen_usage.input == 3000 and res.gen_usage.output == 900 and res.gen_usage.calls == 3
    # Same letter three times: from the second on the repetition check warns, nothing fails.
    first = pool.load("pool_cepheden_000001")
    second = pool.load("pool_cepheden_000002")
    assert first["checks"]["repetition"]["result"] == "pass"
    assert second["checks"]["repetition"]["result"] == "warn"
    assert all(r["status"] == "accepted" for r in pool.all())
    assert first["meta"]["tokens"] == {"input": 1000, "output": 300}
    assert first["review"]["scores"]["sahicilik"] == 5
    rows = pool.write_index()
    assert len(rows) == 3 and rows[0]["status"] == "accepted"


def test_ids_continue_after_existing_letters(settings):
    _run(settings, FakeModel(), count=2)
    pool, res, _ = _run(settings, FakeModel(), count=1)
    assert res.records[0]["id"] == "pool_cepheden_000003"


@pytest.mark.parametrize("score, status", [(5, "accepted"), (3, "needs_review"), (2, "rejected")])
def test_review_thresholds(settings, score, status):
    scores = {k: 5 for k in review.CRITERIA}
    scores["olculuk"] = score
    pool, _, _ = _run(settings, FakeModel(scores=scores), count=1)
    assert next(pool.all())["status"] == status


def test_failed_checks_reject_without_review(settings):
    model = FakeModel(letter=GOOD_LETTER.replace("Ordu-yı Hümayun, ⟦Seddülbahir⟧", "Seddülbahir"))
    pool, _, rres = _run(settings, model, count=1)
    rec = next(pool.all())
    assert rec["status"] == "rejected" and rec["review"] is None
    assert rres.records == []


def test_parse_errors_are_kept_as_rejected(settings):
    pool, _, _ = _run(settings, FakeModel(letter="Elbette! İşte mektup:\n" + GOOD_LETTER), count=1)
    rec = next(pool.all())
    assert rec["status"] == "rejected" and "açıklama" in rec["parse_error"]
    assert rec["meta"]["raw"].startswith("Elbette!")


def test_transient_errors_are_retried(settings):
    model = FakeModel(fail_first=2)
    pool, res, _ = _run(settings, model, count=1)
    assert res.records and res.records[0]["meta"]["attempts"] == 3


def test_review_status_rule():
    s = {k: 4 for k in review.CRITERIA}
    assert review.status_for(s) == "accepted"
    assert review.status_for({**s, "somutluk": 3}) == "needs_review"
    assert review.status_for({**s, "somutluk": 1}) == "rejected"
    assert review.status_for({**s, "somutluk": 3}, accept_min=3) == "accepted"


def test_report_and_export(settings, tmp_path):
    from letter_gen import report
    from letter_gen.export import export

    scores = {k: 5 for k in review.CRITERIA}
    scores["donem_dili"] = 3
    pool, _, _ = _run(settings, FakeModel(scores=scores), count=2)
    rec = pool.load("pool_cepheden_000001")
    from letter_gen.record import set_status

    set_status(rec, "accepted", "manual", "iyi")
    pool.save(rec)
    md = report.build(list(pool.all()))
    assert md.index("## Elle bakılacaklar") < md.index("pool_cepheden_000002") < md.index("## Reddedilenler")
    assert "| Dönem dili | 3 |" in md
    out = tmp_path / "pool_letters.json"
    assert export(list(pool.all()), out) == 1
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["letters"][0]["id"] == "pool_cepheden_000001"
    assert "meta" not in data["letters"][0] and "segments" in data["letters"][0]
