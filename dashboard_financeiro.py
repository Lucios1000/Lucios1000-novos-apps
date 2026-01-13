
import sqlite3

def exibir_resumo_mensal():
    try:
        conn = sqlite3.connect('tkx_franca.db')
        cursor = conn.cursor()

        # Query para consolidar os dados do DRE
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

        if not dados or dados[0] == 0:
            print("Status: Banco conectado.")
            print("Aviso: Nenhuma corrida registrada ainda.")
        else:
            total, bruto, comissao, gate, oper = dados
            lucro_liquido = (comissao or 0) - (gate or 0) - (oper or 0)
            
            print(f"Total de Corridas: {total}")
            print(f"Faturamento Bruto: R$ {bruto or 0:.2f}")
            print(f"Sua Comissão (15%): R$ {comissao or 0:.2f}")
            print(f"--------------------------------")
            print(f"(-) Custo Gateway: R$ {gate or 0:.2f}")
            print(f"(-) Custos Fixos:  R$ {oper or 0:.2f}")
            print(f"--------------------------------")
            print(f"LUCRO LÍQUIDO REAL: R$ {lucro_liquido:.2f}")
        
        print("================================\n")
        conn.close()
    except Exception as e:
        print(f"Erro ao acessar o banco: {e}")

if __name__ == "__main__":
    exibir_resumo_mensal()