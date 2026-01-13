import sqlite3
import random
from datetime import datetime, timedelta

def popular_banco():
    conn = sqlite3.connect('tkx_franca.db')
    cursor = conn.cursor()

    print("⏳ Gerando 100 corridas de teste para o BI... Aguarde.")

    # Lista de motoristas e clientes para o teste
    motoristas = [1] # Fernanda (ID 1)
    clientes = [1]   # Alessandro (ID 1)
    
    for _ in range(100):
        # Gera data e hora aleatória nos últimos 30 dias
        dias_atras = random.randint(0, 30)
        hora = random.randint(0, 23)
        minuto = random.randint(0, 59)
        data_hora = datetime.now() - timedelta(days=dias_atras)
        hora_str = f"{hora:02d}:{minuto:02d}"

        km = round(random.uniform(2.0, 25.0), 1)
        valor_base = 5.0 + (km * 2.5) # Simulação de tarifa base
        
        # Simula multiplicadores dinâmicos
        multiplicador = 1.0
        if 6 <= hora < 11: multiplicador = 1.0
        elif 20 <= hora <= 23: multiplicador = 1.2
        elif 0 <= hora <= 5: multiplicador = 1.4

        valor_total = round(valor_base * multiplicador, 2)
        taxa_app = round(valor_total * 0.15, 2)
        gateway = 0.80
        fixo = 1.35
        
        # Dados extras para o BI Avançado
        preco_concorrente = round(valor_total * random.uniform(0.9, 1.15), 2)
        avaliacao = random.randint(3, 5)

        cursor.execute("""
            INSERT INTO historico_corridas 
            (motorista_id, cliente_id, valor_total_pago, km_distancia, taxa_app_valor, 
             custo_gateway, custos_fixos_totais, hora_partida, preco_concorrente, avaliacao_motorista)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (1, 1, valor_total, km, taxa_app, gateway, fixo, hora_str, preco_concorrente, avaliacao))

    conn.commit()
    conn.close()
    print("✅ Sucesso! 100 corridas inseridas. Agora teste as opções 7 e 8 no Menu Principal.")

if __name__ == "__main__":
    popular_banco()