import sqlite3

from tkx_py.paths import get_db_path


DB_PATH = get_db_path("tkx_franca.db")


def table_exists(cursor: sqlite3.Cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ? LIMIT 1",
        (table_name,),
    )
    return cursor.fetchone() is not None


def get_columns(cursor: sqlite3.Cursor, table_name: str) -> set[str]:
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}


def add_column_if_missing(cursor: sqlite3.Cursor, table: str, column: str, ddl_type: str) -> None:
    cols = get_columns(cursor, table)
    if column in cols:
        return
    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}")


def migrate(db_path: str = DB_PATH) -> None:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Garantir tabelas base usadas pelo app
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS motoristas_cadastro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            telefone TEXT,
            veiculo_modelo TEXT,
            placa TEXT UNIQUE,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pendente'
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE,
            telefone TEXT UNIQUE NOT NULL,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_corridas INTEGER DEFAULT 0,
            nota_media REAL DEFAULT 5.0
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS historico_corridas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            motorista_id INTEGER,
            valor_total_pago REAL,
            km_distancia REAL,
            taxa_app_valor REAL,
            custo_gateway REAL,
            custos_fixos_totais REAL,
            liquido_motorista REAL,
            data_corrida DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Migração de colunas faltantes (BI + scripts)
    add_column_if_missing(cursor, "historico_corridas", "cliente_id", "INTEGER")
    add_column_if_missing(cursor, "historico_corridas", "hora_partida", "TEXT")
    add_column_if_missing(cursor, "historico_corridas", "preco_concorrente", "REAL")
    add_column_if_missing(cursor, "historico_corridas", "avaliacao_motorista", "INTEGER")
    add_column_if_missing(cursor, "historico_corridas", "data_cadastro", "DATETIME DEFAULT CURRENT_TIMESTAMP")

    # Tabelas de dinâmica usadas pelo simulador
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tarifas_dinamicas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            periodo TEXT UNIQUE,
            hora_inicio TIME,
            hora_fim TIME,
            multiplicador REAL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS grade_horarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            periodo TEXT UNIQUE,
            hora_inicio TIME,
            hora_fim TIME,
            multiplicador REAL
        )
        """
    )

    # Seeds idempotentes
    cursor.executemany(
        "INSERT OR IGNORE INTO tarifas_dinamicas (periodo, hora_inicio, hora_fim, multiplicador) VALUES (?, ?, ?, ?)",
        [
            ("Madrugada", "00:00", "05:59", 1.2),
            ("Normal", "06:00", "17:59", 1.0),
            ("Pico", "18:00", "20:59", 1.1),
            ("Noite", "21:00", "23:59", 1.2),
        ],
    )

    cursor.executemany(
        "INSERT OR IGNORE INTO grade_horarios (periodo, hora_inicio, hora_fim, multiplicador) VALUES (?, ?, ?, ?)",
        [
            ("Madrugada", "00:00", "05:59", 1.2),
            ("Normal", "06:00", "17:59", 1.0),
            ("Pico", "18:00", "20:59", 1.1),
            ("Noite", "21:00", "23:59", 1.2),
        ],
    )

    # View de compatibilidade para o BI (bi_estrategico)
    cursor.execute(
        """
        CREATE VIEW IF NOT EXISTS clientes_cadastro AS
        SELECT id, nome, email, telefone, data_cadastro, total_corridas, nota_media
        FROM clientes
        """
    )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    migrate()
    print("✅ Migração concluída com sucesso.")
