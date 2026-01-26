import sqlite3
from tkx_py.paths import get_db_path

def cadastrar_motorista():
    nome = input("Nome do Motorista: ")
    cpf = input("CPF: ")
    tel = input("Telefone: ")
    placa = input("Placa do Veículo: ")
    modelo = input("Modelo do Veículo: ")

    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO motoristas_cadastro (nome, cpf, telefone, placa, veiculo_modelo, status) 
            VALUES (?, ?, ?, ?, ?, 'ativo')
        """, (nome, cpf, tel, placa, modelo))
        conn.commit()
        print(f"\n✅ Motorista {nome} cadastrado com sucesso!")
        conn.close()
    except Exception as e:
        print(f"\n❌ Erro ao cadastrar: {e}")

def cadastrar_cliente():
    nome = input("Nome do Cliente: ")
    tel = input("Telefone: ")
    email = input("Email: ")

    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO clientes (nome, telefone, email) 
            VALUES (?, ?, ?)
        """, (nome, tel, email))
        conn.commit()
        print(f"\n✅ Cliente {nome} cadastrado com sucesso!")
        conn.close()
    except Exception as e:
        print(f"\n❌ Erro ao cadastrar: {e}")

# Menu Principal
print("--- SISTEMA DE CADASTRO TKX ---")
opcao = input("Deseja cadastrar [1] Motorista ou [2] Cliente? ")

if opcao == '1':
    cadastrar_motorista()
elif opcao == '2':
    cadastrar_cliente()
else:
    print("Opção inválida.")