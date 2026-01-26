import sqlite3
from datetime import datetime
from tkx_py.paths import get_db_path

def calcular_simulacao(distancia_km, hora_manual=None):
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()

    # Se não digitarmos uma hora, ele pega a hora atual do computador
    if hora_manual:
        hora_atual = hora_manual
    else:
        hora_atual = datetime.now().strftime('%H:%M')

    # Busca a dinâmica para o horário informado
    cursor.execute("""
        SELECT periodo, multiplicador 
        FROM tarifas_dinamicas 
        WHERE ? BETWEEN hora_inicio AND hora_fim
    """, (hora_atual,))
    
    resultado = cursor.fetchone()
    
    if not resultado:
        # Caso o horário esteja no limite da meia-noite (00:00)
        cursor.execute("SELECT periodo, multiplicador FROM tarifas_dinamicas WHERE periodo = 'Noite'")
        resultado = cursor.fetchone()

    periodo, multiplicador = resultado

    # Regra de cálculo base (Exemplo: R$ 2.00 por KM + R$ 5.00 base)
    valor_base = 5.00 + (distancia_km * 2.50)
    valor_final = valor_base * multiplicador

    print("\n" + "="*40)
    print("      SIMULADOR DE CORRIDA TKX")
    print("="*40)
    print(f"Horário da Corrida: {hora_atual}")
    print(f"Período Detectado:  {periodo}")
    print(f"Dinâmica Aplicada:  {multiplicador:.1f}x ({(multiplicador-1)*100:+.0f}%)")
    print(f"Distância:          {distancia_km} KM")
    print("-" * 40)
    print(f"VALOR ESTIMADO:     R$ {valor_final:.2f}")
    print("="*40 + "\n")

    conn.close()

if __name__ == "__main__":
    km = float(input("Distância da corrida (KM): "))
    h = input("Deseja testar um horário específico? (HH:MM) ou Enter para agora: ")
    calcular_simulacao(km, h if h else None)