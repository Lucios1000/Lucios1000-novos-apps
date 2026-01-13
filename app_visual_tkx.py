import customtkinter as ctk
import sqlite3

class AppTKX(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("SISTEMA TKX - UNIDADE FRANCA")
        self.geometry("1100x750")
        ctk.set_appearance_mode("dark")

        # Sistema de Abas Superior
        self.tabview = ctk.CTkTabview(self, width=1050, height=700)
        self.tabview.pack(padx=20, pady=20)

        # Criando as abas solicitadas
        self.tabview.add("📊 Dashboard")
        self.tabview.add("🚕 BI Operacional")
        self.tabview.add("📈 BI Estratégico")

        self.setup_dashboard()
        self.setup_bi_operacional()
        self.setup_bi_estrategico()

    def setup_dashboard(self):
        tab = self.tabview.tab("📊 Dashboard")
        ctk.CTkLabel(tab, text="RESUMO FINANCEIRO (DRE)", font=("Arial", 22, "bold")).pack(pady=10)
        self.txt_dash = ctk.CTkTextbox(tab, width=900, height=200, font=("Courier New", 16))
        self.txt_dash.pack(pady=10)
        ctk.CTkButton(tab, text="CARREGAR DADOS", command=self.atualizar_financeiro).pack(pady=10)

    def setup_bi_operacional(self):
        tab = self.tabview.tab("🚕 BI Operacional")
        ctk.CTkLabel(tab, text="PERFORMANCE POR TURNO (12h)", font=("Arial", 20, "bold")).pack(pady=10)
        
        # Container para os dois turnos lado a lado
        self.frame_oper = ctk.CTkFrame(tab)
        self.frame_oper.pack(fill="both", expand=True, padx=10, pady=10)
        
        self.txt_diurno = ctk.CTkTextbox(self.frame_oper, width=450, height=400)
        self.txt_diurno.pack(side="left", padx=10, pady=10)
        
        self.txt_noturno = ctk.CTkTextbox(self.frame_oper, width=450, height=400)
        self.txt_noturno.pack(side="right", padx=10, pady=10)
        
        ctk.CTkButton(tab, text="ANALISAR TURNOS", command=self.atualizar_operacional).pack(pady=10)

    def setup_bi_estrategico(self):
        tab = self.tabview.tab("📈 BI Estratégico")
        ctk.CTkLabel(tab, text="RX DE MERCADO E LUCRATIVIDADE", font=("Arial", 20, "bold")).pack(pady=10)
        self.txt_estrat = ctk.CTkTextbox(tab, width=900, height=450)
        self.txt_estrat.pack(pady=10)
        ctk.CTkButton(tab, text="GERAR RX COMPLETO", command=self.atualizar_estrategico).pack(pady=10)

    # --- Lógica de Banco de Dados para as Abas ---

    def atualizar_financeiro(self):
        conn = sqlite3.connect('tkx_franca.db')
        cursor = conn.cursor()
        cursor.execute("SELECT SUM(valor_total_pago), SUM(taxa_app_valor) FROM historico_corridas")
        res = cursor.fetchone()
        bruto = res[0] or 0
        lucro = res[1] or 0
        
        self.txt_dash.delete("1.0", "end")
        self.txt_dash.insert("end", f"FATURAMENTO BRUTO: R$ {bruto:.2f}\nLUCRO TKX (15%): R$ {lucro:.2f}\nSTATUS: OPERACIONAL")
        conn.close()

    def atualizar_operacional(self):
        conn = sqlite3.connect('tkx_franca.db')
        cursor = conn.cursor()
        
        # Diurno 06h-18h
        cursor.execute("SELECT m.nome, COUNT(h.id) FROM motoristas_cadastro m JOIN historico_corridas h ON m.id = h.motorista_id WHERE h.hora_partida BETWEEN '06:00' AND '18:00' GROUP BY m.nome ORDER BY COUNT(h.id) DESC LIMIT 10")
        diurno = cursor.fetchall()
        self.txt_diurno.delete("1.0", "end")
        self.txt_diurno.insert("end", "☀️ TURNO DIURNO (06h - 18h)\n" + "="*30 + "\n")
        for nome, qtd in diurno: self.txt_diurno.insert("end", f"{nome[:15]:<15} | Corridas: {qtd}\n")

        # Noturno 18h-06h
        cursor.execute("SELECT m.nome, COUNT(h.id) FROM motoristas_cadastro m JOIN historico_corridas h ON m.id = h.motorista_id WHERE h.hora_partida > '18:00' OR h.hora_partida < '06:00' GROUP BY m.nome ORDER BY COUNT(h.id) DESC LIMIT 10")
        noturno = cursor.fetchall()
        self.txt_noturno.delete("1.0", "end")
        self.txt_noturno.insert("end", "🌙 TURNO NOTURNO (18h - 06h)\n" + "="*30 + "\n")
        for nome, qtd in noturno: self.txt_noturno.insert("end", f"{nome[:15]:<15} | Corridas: {qtd}\n")
        conn.close()

    def atualizar_estrategico(self):
        conn = sqlite3.connect('tkx_franca.db')
        cursor = conn.cursor()
        cursor.execute("SELECT AVG(valor_total_pago), AVG(preco_concorrente) FROM historico_corridas WHERE preco_concorrente IS NOT NULL")
        precos = cursor.fetchone()
        
        self.txt_estrat.delete("1.0", "end")
        if precos[0]:
            diff = ((precos[0] / precos[1]) - 1) * 100
            status = "MAIS CARO" if diff > 0 else "MAIS BARATO"
            self.txt_estrat.insert("end", f"📊 MERCADO: {abs(diff):.1f}% {status} que a concorrência\n\n")
        
        self.txt_estrat.insert("end", "💎 CORRIDAS COM MAIOR LUCRATIVIDADE:\n")
        cursor.execute("SELECT id, (taxa_app_valor - custo_gateway - custos_fixos_totais) as lucro FROM historico_corridas ORDER BY lucro DESC LIMIT 5")
        for id_c, lucro in cursor.fetchall():
            self.txt_estrat.insert("end", f"Corrida #{id_c} | Lucro TKX: R$ {lucro:.2f}\n")
        conn.close()

if __name__ == "__main__":
    app = AppTKX()
    app.mainloop()