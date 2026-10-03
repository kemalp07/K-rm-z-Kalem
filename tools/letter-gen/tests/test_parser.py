import pytest

from conftest import GOOD_LETTER
from letter_gen.parser import ParseError, parse, split_sentences


def test_fields_and_sensitive_marks():
    p = parse(GOOD_LETTER)
    assert p.header.text == "Ordu-yı Hümayun, Seddülbahir, 4 Mayıs 1331"
    assert p.header.sensitive
    assert p.salutation == "Valideciğim,"
    assert p.closing == "Duanızı bekleriz."
    assert p.note.sensitive and p.note.text == "Alay yarın yer değiştiriyor."
    assert not p.envelope.sensitive


def test_mark_inside_a_sentence_splits_it_and_keeps_order():
    p = parse(GOOD_LETTER)
    texts = [(s.text, s.kind, s.para) for s in p.segments]
    assert ("Bizi", "normal", 0) in texts
    i = texts.index(("Bizi", "normal", 0))
    assert texts[i + 1] == ("kuzeydeki sırta", "sensitive", 0)
    assert texts[i + 2] == ("aldılar, merak etmeyin.", "normal", 0)
    assert texts[-1][2] == 1  # second paragraph
    assert [s.id for s in p.segments] == [f"s{n}" for n in range(1, len(p.segments) + 1)]
    assert all("⟦" not in s.text and "⟧" not in s.text for s in p.segments)


def test_abbreviation_does_not_end_sentence():
    assert split_sentences("Çoraplar geldi, Ef. Hazretleri selam söyledi. Sonra gitti.") == [
        "Çoraplar geldi, Ef. Hazretleri selam söyledi.",
        "Sonra gitti.",
    ]


def test_seal_is_split_from_signature():
    p = parse(GOOD_LETTER)
    assert p.signature == "Oğlunuz Mehmet"
    assert p.seal == "Mehmet"


def test_note_is_optional():
    p = parse(GOOD_LETTER.replace("NOT: ⟦Alay yarın yer değiştiriyor.⟧\n", ""))
    assert p.note is None


def test_markdown_bold_labels_are_tolerated():
    raw = GOOD_LETTER.replace("BAŞLIK:", "**BAŞLIK:**")
    assert parse(raw).header.sensitive


@pytest.mark.parametrize(
    "raw, message",
    [
        (GOOD_LETTER.replace("KAPANIŞ: Duanızı bekleriz.\n", ""), "eksik alan"),
        ("İşte istediğiniz mektup:\n" + GOOD_LETTER, "açıklama"),
        (GOOD_LETTER.replace("Elinizden öperim.", "*mektubu katlar* Elinizden öperim."), "yıldız"),
        (GOOD_LETTER.replace("⟦kuzeydeki sırta⟧", "⟦kuzeydeki sırta"), "kapanmamış"),
        (GOOD_LETTER + "\nUmarım beğenirsiniz.\n", "fazladan"),
        (GOOD_LETTER.replace("HİTAP: Valideciğim,\n", "") .replace("BAŞLIK:", "HİTAP: Valideciğim,\nBAŞLIK:"), "sıra"),
    ],
)
def test_malformed_letters_are_rejected(raw, message):
    with pytest.raises(ParseError, match=message):
        parse(raw)
