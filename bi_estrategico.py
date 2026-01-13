import sqlite3

def bi_estrategico():
    conn = sqlite3.connect('tkx_franca.db')
    cursor = conn.cursor()

    print("\n" + "📈"*25)
    print("      RX FINANCEIRO E COMPARATIVO DE MERCADO")
    print("📈"*25)

    # 1. Comparativo de Mercado
    cursor.execute("SELECT AVG(valor_total_pago), AVG(preco_concorrente) FROM historico_corridas WHERE preco_concorrente IS NOT NULL")
    precos = cursor.fetchone()
    if precos and precos[0] and precos[1]:
        diff = ((precos[0] / precos[1]) - 1) * 100
        status = "MAIS CARO" if diff > 0 else "MAIS BARATO"
        print(f"Status vs Concorrência: {abs(diff):.1f}% {status} que a média local")
    else:
        print("Status vs Concorrência: Dados insuficientes para comparar.")

    # 2. Top 5 Corridas Lucrativas
    print("\n💎 TOP 5 CORRIDAS MAIS LUCRATIVAS (MARGEM LÍQUIDA):")
    query = """
        SELECT id, (taxa_app_valor - custo_gateway - custos_fixos_totais) as lucro_real
        FROM historico_corridas
        ORDER BY lucro_real DESC LIMIT 5
    """
    cursor.execute(query)
    corridas = cursor.fetchall()
    for id_c, lucro in corridas:
        print(f"Corrida #{id_c} | Lucro Líquido: R$ {lucro:.2f}")

    # 3. RX de Clientes (Fidelidade) - Com tratamento de erro para a tabela
    print("\n👥 CLIENTES MAIS FIÉIS (Top 3):")
    try:
        cursor.execute("""
            SELECT c.nome, COUNT(h.id) 
            FROM clientes_cadastro c 
            JOIN historico_corridas h ON c.id = h.cliente_id 
            GROUP BY c.nome 
            ORDER BY COUNT(h.id) DESC LIMIT 3
        """)
        clientes = cursor.fetchall()
        if not clientes:
            print("Nenhum dado de cliente fiel encontrado ainda.")
        for nome, total in clientes:
            print(f"Passageiro: {nome} | Viagens: {total}")
    except sqlite3.OperationalError:
        print("Aviso: Tabela de clientes ainda não populada ou vinculada.")

    conn.close()

if __name__ == "__main__":
    bi_estrategico()