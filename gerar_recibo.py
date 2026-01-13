import sqlite3
from datetime import datetime

def gerar_recibo_texto(motorista_id, distancia_km, valor_total):
    conn = sqlite3.connect('tkx_franca.db')
    cursor = conn.cursor()

    # Busca dados do motorista para o recibo
    cursor.execute("SELECT nome, veiculo_modelo, placa FROM motoristas_cadastro WHERE id = ?", (motorista_id,))
    motorista = cursor.fetchone()
    
    nome_m, carro, placa = motorista if motorista else ("Motorista TKX", "Veículo Padrão", "---")

    data_atual = datetime.now().strftime('%d/%m/%Y %H:%M')

    recibo = f"""
========================================
         RECIBO DE VIAGEM - TKX
========================================
DATA/HORA: {data_atual}
DISTÂNCIA: {distancia_km} KM
----------------------------------------
MOTORISTA: {nome_m}
VEÍCULO:   {carro}
PLACA:     {placa}
----------------------------------------
VALOR TOTAL: R$ {valor_total:.2f}
----------------------------------------
   Obrigado por viajar com a TKX!
   Sua mobilidade em Franca e região.
========================================
    """
    
    nome_arquivo = f"recibo_{datetime.now().strftime('%H%M%S')}.txt"
    with open(nome_arquivo, "w", encoding="utf-8") as f:
        f.write(recibo)
    
    print(recibo)
    print(f"✅ Recibo salvo como: {nome_arquivo}")
    conn.close()

if __name__ == "__main__":
    m_id = input("ID do Motorista: ")
    dist = float(input("Distância (KM): "))
    val = float(input("Valor Cobrado (R$): "))
    gerar_recibo_texto(m_id, dist, val)