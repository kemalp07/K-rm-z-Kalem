import copy

import pytest

from conftest import GOOD_LETTER
from letter_gen import checks, record
from letter_gen.parser import parse
from letter_gen.sampler import Person, Request


def make_request(**kw) -> Request:
    base = dict(
        direction="cepheden",
        sender=Person(name="Mehmet", gender="erkek", age=24, rank="er", hometown="Sivas", occupation="çiftçi", epithet="Sivaslı"),
        recipient=Person(name="Fatma", gender="kadın", age=48, relation="annesi", hometown="Sivas"),
        recipient_location="Sivas",
        writes="self",
        writer=None,
        literacy="low",
        voice="sade",
        topic="hasat",
        hidden="yaralandığını",
        carelessness="high",
        sensitive_info="yok",
        length_label="kısa",
        length_target=30,
        soldier_relation="oğlu",
    )
    base.update(kw)
    return Request(**base)


def make_record(raw=GOOD_LETTER, **kw):
    req = make_request(**kw)
    return record.build("pool_cepheden_000001", req, "[MEKTUP İSTEĞİ]", parse(raw), {})


CTX = checks.CheckContext(forbidden=["stres", "travma", "harika"], low_literacy_words=["mühim", "kelam", "lakin"])


def test_good_letter_passes_everything():
    rec = make_record()
    res = checks.run_all(rec, CTX)
    assert checks.failed(res) == []
    assert res["sensitive_balance"]["result"] == "pass"  # two body marks + note = 3, "çok" allows 2–3


def test_length_window():
    rec = make_record(length_target=100)
    assert checks.check_length(rec, CTX)["result"] == "fail"
    rec = make_record(length_target=24)
    assert checks.check_length(rec, CTX)["result"] in ("pass", "warn")


def test_forbidden_words_match_suffixes_for_long_words():
    rec = make_record(GOOD_LETTER.replace("Öküzü satmayın.", "Burası harikadır."))
    r = checks.check_forbidden(rec, CTX)
    assert r["result"] == "fail" and "harika" in r["detail"]


def test_low_literacy_words():
    raw = GOOD_LETTER.replace("Öküzü satmayın.", "Lakin öküzü satmayın.")
    assert checks.check_literacy_words(make_record(raw), CTX)["result"] == "fail"
    assert checks.check_literacy_words(make_record(raw, literacy="high"), CTX)["result"] == "pass"
    # an illiterate soldier's words written down by a comrade: still plain
    assert checks.check_literacy_words(make_record(raw, literacy="none", writes="dictated"), CTX)["result"] == "fail"
    # a professional scribe may write formally
    assert checks.check_literacy_words(make_record(raw, literacy="none", writes="scribe"), CTX)["result"] == "pass"


@pytest.mark.parametrize(
    "replacement",
    ["Elinizden öperim (gülümseyerek).", "Elinizden öperim diye yazdı."],
)
def test_narrator_traces(replacement):
    rec = make_record(GOOD_LETTER.replace("Elinizden öperim.", replacement))
    assert checks.check_narrator(rec)["result"] == "fail"


def test_sensitive_balance_by_carelessness():
    assert checks.check_sensitive_balance(make_record(carelessness="none"))["result"] == "warn"
    clean = GOOD_LETTER.replace("⟦kuzeydeki sırta⟧", "kuzeydeki sırta").replace("NOT: ⟦Alay yarın yer değiştiriyor.⟧\n", "")
    assert checks.check_sensitive_balance(make_record(clean, carelessness="none"))["result"] == "pass"
    assert checks.check_sensitive_balance(make_record(clean, carelessness="low"))["result"] == "warn"


def test_military_header():
    assert checks.check_header(make_record(), CTX)["result"] == "pass"
    unmarked = GOOD_LETTER.replace("⟦Seddülbahir⟧", "Seddülbahir")
    assert checks.check_header(make_record(unmarked), CTX)["result"] == "fail"
    dated_only = GOOD_LETTER.replace("⟦Seddülbahir⟧, ", "")
    assert checks.check_header(make_record(dated_only), CTX)["result"] == "pass"
    wrong = GOOD_LETTER.replace("Ordu-yı Hümayun, ⟦Seddülbahir⟧", "Siperden")
    assert checks.check_header(make_record(wrong), CTX)["result"] == "fail"
    assert checks.check_header(make_record(wrong, direction="cepheye"), CTX)["result"] == "pass"


def test_envelopes():
    assert checks.check_envelope(make_record())["result"] == "pass"
    mil = GOOD_LETTER.replace("ZARF: Sivas, Hafik kazası, Tuzhisar köyü, Fatma Hanım'a", "ZARF: Ordu-yı Hümayun, [..] Alay, [..] Tabur, Mehmet'e")
    assert checks.check_envelope(make_record(mil, direction="cepheye"))["result"] == "pass"
    invented = mil.replace("[..] Alay", "27. Alay")
    assert checks.check_envelope(make_record(invented, direction="cepheye"))["result"] == "fail"
    spelled = mil.replace("[..] Alay", "Yirmi Yedinci Alay").replace("[..] Tabur", "ikinci tabur")
    assert checks.check_envelope(make_record(spelled, direction="cepheye"))["result"] == "fail"
    odd = GOOD_LETTER.replace("Sivas, Hafik kazası, Tuzhisar köyü, Fatma Hanım'a", "Fatma Hanım'a")
    assert checks.check_envelope(make_record(odd))["result"] == "warn"


def test_seal_for_illiterate_senders():
    no_seal = GOOD_LETTER.replace(" (mühür: Mehmet)", "")
    assert checks.check_seal(make_record(no_seal, literacy="none", writes="dictated"))["result"] == "fail"
    assert checks.check_seal(make_record(literacy="none", writes="dictated"))["result"] == "pass"
    assert checks.check_seal(make_record(no_seal))["result"] == "pass"


def test_repetition():
    rec = make_record()
    other = ("pool_cepheye_000001", "Hasadı Osman mı kaldıracak? Öküzü satmayın, dedi.")
    ctx = copy.replace(CTX, others=[other]) if hasattr(copy, "replace") else checks.CheckContext(**{**CTX.__dict__, "others": [other]})
    r = checks.check_repetition(rec, ctx)
    assert r["result"] == "warn" and "pool_cepheye_000001" in r["detail"]
    ctx2 = checks.CheckContext(**{**CTX.__dict__, "others": [("x", "bambaşka bir mektup metni burada duruyor")]})
    assert checks.check_repetition(rec, ctx2)["result"] == "pass"


def test_parse_error_is_a_format_fail():
    req = make_request()
    rec = record.build("pool_cepheden_000002", req, "", None, {}, parse_error="eksik alan: ZARF")
    res = checks.run_all(rec, CTX)
    assert res == {"format": {"result": "fail", "detail": "eksik alan: ZARF"}}
