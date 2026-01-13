import sqlite3

def exibir_resumo_mensal():
    try:
        conn = sqlite3.connect('tkx_franca.db')
        cursor = conn.cursor()

        # Sua Query original (está perfeita!)
        query = """
        SELECT 
            COUNT(id) as total_viagens,
            SUM(valor_total_pago) as faturamento_bruto,
            SUM(taxa_app_valor) as comissao_tkx,
            SUM(custo_gateway) as gateway,
            SUM(custos_fixos_totais) as operacao
        FROM historico_corridas;
        """
        
        cursor.execute(query)
        dados = cursor.fetchone()
        
        print("\n================================")
        print("      SISTEMA DE GESTÃO TKX     ")
        print("================================")

        # O segredo está aqui: se o banco retornar vazio, usamos 0 ou 0.0
        total = dados[0] if dados[0] else 0
        bruto = dados[1] if dados[1] else 0.0
        comissao = dados[2] if dados[2] else 0.0
        gate = dados[3] if dados[3] else 0.0
        oper = dados[4] if dados[4] else 0.0

        if total == 0:
            print("Status: Banco conectado.")
            print("Aviso: Nenhuma corrida registrada ainda no sistema.")
        else:
            # Cálculo do Lucro Líquido Real (Sua lógica de DRE)
            lucro_liquido = comissao - gate - oper
            
            print(f"Total de Corridas: {total}")
            print(f"Faturamento Bruto: R$ {bruto:.2f}")
            print(f"Sua Comissão (15%): R$ {comissao:.2f}")
            print(f"--------------------------------")
            print(f"(-) Custo Gateway: R$ {gate:.2f}")
            print(f"(-) Custos Fixos:  R$ {oper:.2f}")
            print(f"--------------------------------")
            print(f"LUCRO LÍQUIDO REAL: R$ {lucro_liquido:.2f}")
        
        print("================================\n")
        conn.close()
    except Exception as e:
        print(f"Erro ao acessar o banco: {e}")

if __name__ == "__main__":
    exibir_resumo_mensal()