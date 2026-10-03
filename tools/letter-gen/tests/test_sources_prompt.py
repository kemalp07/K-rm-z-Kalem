from conftest import FIX
from letter_gen import prompt, request_text
from letter_gen.sampler import Sampler
from letter_gen.sources import author_note, find_entry, forbidden_words, load_card, load_lorebook, reserved_names, select_entries


def test_card_and_lorebook_load():
    card = load_card(FIX / "card.json")
    assert card.depth_prompt == "Duyguları adlandırma."
    lore = load_lorebook(FIX / "lorebook.json")
    assert {e.comment for e in lore} >= {"Dönem", "Sivas"}


def test_entry_selection_constant_first_by_order_then_keywords():
    lore = load_lorebook(FIX / "lorebook.json")
    chosen = [e.comment for e in select_entries(lore, "Memleketi: SİVAS")]
    assert chosen == ["Dil kuralları ve yasak kelimeler", "Dönem", "Sivas"]
    assert "Sivas" not in [e.comment for e in select_entries(lore, "Memleketi: Konya")]
    assert "Kapalı" not in chosen


def test_forbidden_words_from_lorebook():
    lore = load_lorebook(FIX / "lorebook.json")
    words = forbidden_words(find_entry(lore, "Dil kuralları ve yasak kelimeler"))
    # quoted items, then the "KULLANILMAZ" list without its "bunun yerine" alternatives
    assert words == ["stres", "travma", "okey", "depresyon", "problem", "harika"]


def test_reserved_names_and_author_note():
    lore = load_lorebook(FIX / "lorebook.json")
    assert reserved_names(lore) == {"Mehmet"}
    assert author_note(FIX / "author_note.txt", "YAN MEKTUP TOPLU ÜRETİM NOTU") == "[Toplu üretim: her mektup farklı olsun.]"
    assert author_note(FIX / "nope.txt", "x") == ""


def test_request_uses_card_label_order(pools):
    card = load_card(FIX / "card.json")
    labels, unknown = request_text.label_order(pools, card.first_mes, card.mes_example)
    assert unknown == []
    # the greeting's full template wins over the shorter example
    assert labels == ["Gönderen", "Alıcı", "Yön", "Yazma biçimi", "Okuryazarlık", "Sakladığı", "Dikkatsizlik", "Paket", "Uzunluk", "Varyasyon"]
    req = Sampler(pools, seed=4).sample("cepheden")
    text = request_text.render(req, pools, labels)
    lines = text.splitlines()
    assert lines[0] == "[MEKTUP İSTEĞİ]"
    # no package from the front, and Varyasyon is never written
    assert [l.split(":")[0] for l in lines[1:]] == [l for l in labels if l not in ("Paket", "Varyasyon")]
    assert lines[1].startswith(f"Gönderen: {req.sender.name}, {req.sender.epithet}, {req.sender.age}, ")
    assert req.home_address in lines[1]
    assert lines[-1] == f"Uzunluk: {req.length_target}"


def test_request_lines_for_a_letter_to_the_front(pools):
    from letter_gen.sampler import Sampler as S

    s = S(pools, seed=12)
    req = next(r for r in (s.sample("cepheye") for _ in range(50)) if r.writes == "dictated")
    text = request_text.render(req, pools, list(pools["request_labels"]))
    assert f"Alıcı: {req.soldier_relation[:1].upper()}{req.soldier_relation[1:]} {req.recipient.rank[:1].upper()}" in text
    assert text.splitlines()[2].endswith(", cephede")
    assert f"Yazma biçimi: yazdırıyor (yazan: {req.writer})" in text
    assert "Okuryazarlık: yok" in text


def test_prompt_build():
    card = load_card(FIX / "card.json")
    lore = load_lorebook(FIX / "lorebook.json")
    p = prompt.build(card, lore, "[MEKTUP İSTEĞİ]\nMemleketi: Sivas", "Kullanıcı", "[Toplu not]")
    assert p.system.startswith("Sen Mektup Atölyesisın.")
    assert "Yıl 1915" in p.system and "kış erken gelir" in p.system and "Bu girdi kapalı" not in p.system
    assert [r for r, _ in p.turns] == ["user", "model", "user", "model"]
    assert p.turns[1][1].startswith("BAŞLIK: Ordu-yı Hümayun")
    assert "{{" not in p.system + "".join(t for _, t in p.turns)
    assert p.user.endswith("[Toplu not]\n\nDuyguları adlandırma.\n\nBiçime harfiyen uy; açıklama yazma.")
