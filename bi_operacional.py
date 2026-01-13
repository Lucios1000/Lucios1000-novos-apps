import sqlite3

def bi_operacional():
    conn = sqlite3.connect('tkx_franca.db')
    cursor = conn.cursor()

    print("\n" + "█"*50)
    print("      📊 BI OPERACIONAL - PERFORMANCE TKX")
    print("█"*50)

    # Função interna para buscar Top 10 por turno
    def top_drivers(inicio, fim, turno_nome):
        print(f"\n🏆 TOP 10 DRIVERS - TURNO {turno_nome} ({inicio}h às {fim}h):")
        query = """
            SELECT m.nome, COUNT(h.id), SUM(h.taxa_app_valor)
            FROM motoristas_cadastro m
            JOIN historico_corridas h ON m.id = h.motorista_id
            WHERE h.hora_partida BETWEEN ? AND ?
            GROUP BY m.nome
            ORDER BY SUM(h.taxa_app_valor) DESC LIMIT 10
        """
        cursor.execute(query, (inicio, fim))
        for i, (nome, qtd, valor) in enumerate(cursor.fetchall(), 1):
            print(f"{i:2d}º | {nome[:15]:<15} | Corridas: {qtd:3d} | Lucro TKX: R$ {valor:.2f}")

    top_drivers("06:00", "18:00", "DIURNO")
    top_drivers("18:01", "05:59", "NOTURNO")

    print("\n" + "-"*50)
    print("⭐ MÉTRICAS DE QUALIDADE E RETENÇÃO:")
    cursor.execute("SELECT AVG(avaliacao_motorista) FROM historico_corridas")
    print(f"Nota Média da Frota: {cursor.fetchone()[0] or 0:.1f} / 5.0")
    
    conn.close()

if __name__ == "__main__": bi_operacional()