from __future__ import annotations

from pathlib import Path


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def data_dir() -> Path:
    return project_root() / "data"


def outputs_dir() -> Path:
    return project_root() / "outputs"


def get_db_path(filename: str = "tkx_franca.db") -> str:
    d = data_dir()
    d.mkdir(parents=True, exist_ok=True)
    return str(d / filename)
