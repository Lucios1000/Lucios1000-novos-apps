import sqlite3

from tkx_py.paths import get_db_path


def get_connection(db_path: str = "tkx_franca.db") -> sqlite3.Connection:
    if db_path == "tkx_franca.db":
        db_path = get_db_path("tkx_franca.db")
    return sqlite3.connect(db_path)
