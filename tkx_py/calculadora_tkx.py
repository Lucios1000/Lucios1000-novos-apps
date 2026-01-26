import sqlite3

from tkx_py.paths import get_db_path

def setup_database():
    """Cria a tabela e insere dados de teste se não existirem."""
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    
    # Resetar tabela para garantir schema atualizado
    cursor.execute("DROP TABLE IF EXISTS configuracoes_estrategicas")
    
    cursor.execute('''
        CREATE TABLE configuracoes_estrategicas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            municipio TEXT,
            tarifa_base_fixa REAL,
            valor_por_km REAL,
            custo_gateway_percentual REAL,
            seguro_app_fixo REAL,
            manutencao_app_fixo REAL
        )
    ''')
    
    # Verifica se já existem dados, se não, insere o padrão
    cursor.execute("SELECT count(*) FROM configuracoes_estrategicas WHERE municipio = 'Franca'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO configuracoes_estrategicas (municipio, tarifa_base_fixa, valor_por_km, custo_gateway_percentual, seguro_app_fixo, manutencao_app_fixo) VALUES ('Franca', 5.00, 2.43, 2.5, 0.60, 0.40)")
        conn.commit()
        print("Dados de configuração inseridos com sucesso.")
    
    conn.close()

def calcular_corrida_franca(distancia_km, valor_pago_slider):
    setup_database() # Garante que o banco existe

    # 1. Conecta ao banco de dados que você criou
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()

    # 2. Busca as configurações de Franca que salvamos
    cursor.execute("SELECT tarifa_base_fixa, valor_por_km, custo_gateway_percentual, seguro_app_fixo, manutencao_app_fixo FROM configuracoes_estrategicas WHERE municipio = 'Franca'")
    config = cursor.fetchone()
    
    if config:
        tarifa_base, valor_km, gateway_perc, seguro, manutencao = config

        # 3. Cálculos do DRE (Regras de Negócio do Alessandro)
        custo_transacao = valor_pago_slider * (gateway_perc / 100)
        comissao_bruta_tkx = valor_pago_slider * 0.15 # Seus 15%
        custos_fixos = seguro + manutencao
        
        lucro_liquido_tkx = comissao_bruta_tkx - custo_transacao - custos_fixos
        repasse_motorista = valor_pago_slider - comissao_bruta_tkx

        # 4. Exibe o resultado no console
        print(f"--- RELATÓRIO DE CORRIDA (FRANCA) ---")
        print(f"Distância: {distancia_km}km | Pago pelo Passageiro: R$ {valor_pago_slider:.2f}")
        print(f"-------------------------------------")
        print(f"Repasse p/ Motorista: R$ {repasse_motorista:.2f}")
        print(f"Custo Gateway (2.5%): R$ {custo_transacao:.2f}")
        print(f"Custos Fixos (Seguro/Manut): R$ {custos_fixos:.2f}")
        print(f"LUCRO LÍQUIDO TKX: R$ {lucro_liquido_tkx:.2f}")
    else:
        print("Configuração não encontrada para Franca.")
    
    conn.close()

# TESTE: Uma corrida de 5km onde o passageiro pagou R$ 25.00 no Slider
if __name__ == "__main__":
    calcular_corrida_franca(5, 25.00)