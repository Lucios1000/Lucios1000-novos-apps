import sqlite3
from tkx_py.paths import get_db_path

def listar_cadastros():
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    
    print("\n=== MOTORISTAS CADASTRADOS ===")
    cursor.execute("SELECT nome, placa, status FROM motoristas_cadastro")
    for m in cursor.fetchall():
        print(f"Nome: {m[0]} | Placa: {m[1]} | Status: {m[2]}")
        
    print("\n=== CLIENTES CADASTRADOS ===")
    cursor.execute("SELECT nome, telefone FROM clientes")
    for c in cursor.fetchall():
        print(f"Nome: {c[0]} | Tel: {c[1]}")
    
    conn.close()

if __name__ == "__main__":
    listar_cadastros()