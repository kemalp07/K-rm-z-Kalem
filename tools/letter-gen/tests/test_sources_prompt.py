from conftest import FIX
from letter_gen import prompt, request_text
from letter_gen.sampler import Sampler
from letter_gen.sources import find_entry, forbidden_words, load_card, load_lorebook, select_entries


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
    assert words == ["stres", "travma", "okey", "depresyon", "harika"]


def test_request_uses_card_label_order(pools):
    card = load_card(FIX / "card.json")
    labels, unknown = request_text.label_order(pools, card.mes_example)
    assert unknown == []
    assert labels[:3] == ["Yön", "Gönderen", "Alıcı"]
    req = Sampler(pools, seed=4).sample("cepheden")
    text = request_text.render(req, pools, labels)
    lines = text.splitlines()
    assert lines[0] == "[MEKTUP İSTEĞİ]"
    assert [l.split(":")[0] for l in lines[1:]] == [l for l in labels if l != "Paket"]


def test_prompt_build():
    card = load_card(FIX / "card.json")
    lore = load_lorebook(FIX / "lorebook.json")
    p = prompt.build(card, lore, "[MEKTUP İSTEĞİ]\nMemleketi: Sivas", "Kullanıcı")
    assert p.system.startswith("Sen Mektup Atölyesisın.")
    assert "Yıl 1915" in p.system and "kış erken gelir" in p.system and "Bu girdi kapalı" not in p.system
    assert [r for r, _ in p.turns] == ["user", "model", "user", "model"]
    assert p.turns[1][1].startswith("BAŞLIK: Ordu-yı Hümayun")
    assert "{{" not in p.system + "".join(t for _, t in p.turns)
    assert p.user.endswith("Duyguları adlandırma.\n\nBiçime harfiyen uy; açıklama yazma.")
