import sqlite3
from tkx_py.paths import get_db_path

def conferir_cadastros():
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()

    print("\n" + "="*40)
    print("      RELATÓRIO DE CADASTRADOS TKX")
    print("="*40)

    # Consulta Motoristas
    print("\n>>> MOTORISTAS:")
    cursor.execute("SELECT id, nome, placa, status FROM motoristas_cadastro")
    motoristas = cursor.fetchall()
    if not motoristas:
        print("Nenhum motorista encontrado.")
    for m in motoristas:
        print(f"ID: {m[0]} | Nome: {m[1]} | Placa: {m[2]} | Status: {m[3]}")

    # Consulta Clientes
    print("\n>>> CLIENTES:")
    cursor.execute("SELECT id, nome, telefone FROM clientes")
    clientes = cursor.fetchall()
    if not clientes:
        print("Nenhum cliente encontrado.")
    for c in clientes:
        print(f"ID: {c[0]} | Nome: {c[1]} | Tel: {c[2]}")
    
    print("\n" + "="*40)
    conn.close()

if __name__ == "__main__":
    conferir_cadastros()