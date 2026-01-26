import sqlite3
from datetime import datetime
from tkx_py.paths import get_db_path, outputs_dir

def gerar_recibo_detalhado():
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()

    print("\n--- EMISSÃO DE RECIBO TKX ---")
    m_id = input("ID do Motorista: ")
    partida = input("Local de Partida: ")
    h_partida = input("Horário de Partida (HH:MM): ")
    chegada = input("Local de Chegada: ")
    h_chegada = input("Horário de Chegada (HH:MM): ")
    km = input("KM Percorrido: ")
    tempo = input("Tempo Total (ex: 15 min): ")
    valor = float(input("Valor Total (R$): "))

    # Busca dados do motorista
    cursor.execute("SELECT nome, veiculo_modelo, placa FROM motoristas_cadastro WHERE id = ?", (m_id,))
    motorista = cursor.fetchone()
    nome_m, carro, placa = motorista if motorista else ("Motorista TKX", "Veículo", "---")

    data_atual = datetime.now().strftime('%d/%m/%Y')

    recibo_texto = f"""
========================================
         RECIBO DE VIAGEM - TKX
========================================
DATA: {data_atual}
----------------------------------------
PARTIDA: {h_partida} - {partida}
CHEGADA: {h_chegada} - {chegada}
----------------------------------------
TEMPO TOTAL: {tempo}
DISTÂNCIA:   {km} KM
----------------------------------------
MOTORISTA: {nome_m}
VEÍCULO:   {carro} ({placa})
----------------------------------------
VALOR TOTAL: R$ {valor:.2f}
----------------------------------------
   Obrigado por viajar com a TKX!
========================================
    """
    
    # Salva em arquivo
    out_dir = outputs_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    nome_arq = out_dir / f"recibo_{datetime.now().strftime('%H%M%S')}.txt"
    with open(nome_arq, "w", encoding="utf-8") as f:
        f.write(recibo_texto)
    
    print(recibo_texto)
    print(f"✅ Recibo salvo: {nome_arq}")
    conn.close()

if __name__ == "__main__":
    gerar_recibo_detalhado()