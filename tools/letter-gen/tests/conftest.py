import shutil
from pathlib import Path

import pytest
import yaml

from letter_gen.config import Settings

ROOT = Path(__file__).resolve().parent.parent
FIX = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    """Real config and pools, fixture card and lorebook, a scratch pool directory."""
    for f in ("config.yaml", "pools.yaml"):
        shutil.copy(ROOT / f, tmp_path / f)
    config = yaml.safe_load((tmp_path / "config.yaml").read_text(encoding="utf-8"))
    config["sources"].update(card=str(FIX / "card.json"), lorebook=str(FIX / "lorebook.json"), author_note=str(FIX / "author_note.txt"))
    pools = yaml.safe_load((tmp_path / "pools.yaml").read_text(encoding="utf-8"))
    return Settings(root=tmp_path, config=config, pools=pools)


@pytest.fixture
def pools() -> dict:
    return yaml.safe_load((ROOT / "pools.yaml").read_text(encoding="utf-8"))


GOOD_LETTER = """BAŞLIK: Ordu-yı Hümayun, ⟦Seddülbahir⟧, 4 Mayıs 1331
HİTAP: Valideciğim,
GÖVDE:
Elinizden öperim. Çoraplar geldi, Ef. Hazretleri de selam söyledi.
Bizi ⟦kuzeydeki sırta⟧ aldılar, merak etmeyin.

Hasadı Osman mı kaldıracak? Öküzü satmayın.
KAPANIŞ: Duanızı bekleriz.
İMZA: Oğlunuz Mehmet (mühür: Mehmet)
NOT: ⟦Alay yarın yer değiştiriyor.⟧
ZARF: Sivas, Hafik kazası, Tuzhisar köyü, Fatma Hanım'a
"""
