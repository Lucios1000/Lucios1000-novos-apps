import sqlite3

def gerar_extrato_motorista(motorista_id):
    conn = sqlite3.connect('tkx_franca.db')
    cursor = conn.cursor()

    # 1. Busca os dados do motorista
    cursor.execute("SELECT nome, placa FROM motoristas_cadastro WHERE id = ?", (motorista_id,))
    motorista = cursor.fetchone()

    if not motorista:
        print(f"\n❌ Motorista com ID {motorista_id} não encontrado.")
        conn.close()
        return

    nome, placa = motorista

    # 2. Busca as corridas (Ajustado para usar a coluna correta: data_cadastro)
    cursor.execute("""
        SELECT valor_total_pago, taxa_app_valor, data_cadastro
        FROM historico_corridas 
        WHERE motorista_id = ?
    """, (motorista_id,))
    
    corridas = cursor.fetchall()

    print("\n" + "="*45)
    print(f"      EXTRATO DE REPASSE - TKX FRANCA")
    print("="*45)
    print(f"MOTORISTA: {nome}")
    print(f"VEÍCULO:   {placa}")
    print("-"*45)

    total_repasse = 0

    if not corridas:
        print("Aviso: Nenhuma corrida vinculada a este ID ainda.")
    else:
        for c in corridas:
            valor_pago, taxa_tkx, data = c
            valor_motorista = valor_pago - taxa_tkx
            total_repasse += valor_motorista
            print(f"{data} | Total: R$ {valor_pago:>6.2f} | Seu: R$ {valor_motorista:>6.2f}")

    print("-"*45)
    print(f"VALOR TOTAL A REPASSAR:     R$ {total_repasse:.2f}")
    print("="*45 + "\n")

    conn.close()

if __name__ == "__main__":
    m_id = input("Digite o ID do motorista (Ex: 1): ")
    gerar_extrato_motorista(m_id)