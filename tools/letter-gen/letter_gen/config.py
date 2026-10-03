"""Loads config.yaml, pools.yaml and the environment (.env)."""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Settings:
    root: Path
    config: dict[str, Any]
    pools: dict[str, Any]

    def path(self, rel: str) -> Path:
        p = Path(rel)
        return p if p.is_absolute() else self.root / p

    @property
    def card_path(self) -> Path:
        return self.path(self.config["sources"]["card"])

    @property
    def lorebook_path(self) -> Path:
        return self.path(self.config["sources"]["lorebook"])

    @property
    def pool_dir(self) -> Path:
        return self.root / "pool"


def load_settings(root: Path = ROOT) -> Settings:
    load_dotenv(root / ".env")
    config = yaml.safe_load((root / "config.yaml").read_text(encoding="utf-8"))
    pools = yaml.safe_load((root / "pools.yaml").read_text(encoding="utf-8"))
    return Settings(root=root, config=config, pools=pools)


@dataclass
class ModelEnv:
    project: str
    location: str
    gen_model: str
    review_model: str
    price_gen_in: float
    price_gen_out: float
    price_review_in: float
    price_review_out: float


def model_env() -> ModelEnv:
    """Everything that identifies the cloud project and models comes from the environment."""

    def num(name: str) -> float:
        try:
            return float(os.environ.get(name, "0") or 0)
        except ValueError:
            return 0.0

    return ModelEnv(
        project=os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", ""),
        gen_model=os.environ.get("GEN_MODEL", ""),
        review_model=os.environ.get("REVIEW_MODEL", ""),
        price_gen_in=num("PRICE_GEN_INPUT_PER_M"),
        price_gen_out=num("PRICE_GEN_OUTPUT_PER_M"),
        price_review_in=num("PRICE_REVIEW_INPUT_PER_M"),
        price_review_out=num("PRICE_REVIEW_OUTPUT_PER_M"),
    )


def missing_model_env(env: ModelEnv, need_review: bool) -> list[str]:
    missing = []
    if not env.project:
        missing.append("GOOGLE_CLOUD_PROJECT")
    if not env.location:
        missing.append("GOOGLE_CLOUD_LOCATION")
    if not env.gen_model:
        missing.append("GEN_MODEL")
    if need_review and not env.review_model:
        missing.append("REVIEW_MODEL")
    return missing


def ensure_credentials() -> None:
    """Application Default Credentials, optionally from a key held in an environment variable.

    Where a service-account key can only be stored as an environment variable (a cloud
    session's settings), GOOGLE_CREDENTIALS_JSON may hold the key itself; it is written to
    a private temp file outside the repository and used as GOOGLE_APPLICATION_CREDENTIALS.
    """
    raw = os.environ.get("GOOGLE_CREDENTIALS_JSON", "").strip()
    if not raw or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        return
    info = json.loads(raw)  # fail early on a mangled value
    fd, path = tempfile.mkstemp(prefix="letter-gen-adc-", suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(info, f)
    os.chmod(path, 0o600)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = path
    if not os.environ.get("GOOGLE_CLOUD_PROJECT") and info.get("project_id"):
        os.environ["GOOGLE_CLOUD_PROJECT"] = info["project_id"]
