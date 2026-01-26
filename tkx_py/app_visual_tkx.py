import customtkinter as ctk
from bi_tkx.estrategico import gerar_texto_estrategico
from bi_tkx.financeiro import resumo_financeiro_texto
from bi_tkx.operacional import gerar_texto_operacional_turno

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
        self.txt_dash.delete("1.0", "end")
        self.txt_dash.insert("end", resumo_financeiro_texto())

    def atualizar_operacional(self):
        self.txt_diurno.delete("1.0", "end")
        self.txt_diurno.insert("end", "☀️ TURNO DIURNO (06h - 18h)\n" + "="*30 + "\n")
        self.txt_diurno.insert("end", gerar_texto_operacional_turno("06:00", "18:00", "DIURNO"))

        self.txt_noturno.delete("1.0", "end")
        self.txt_noturno.insert("end", "🌙 TURNO NOTURNO (18h - 06h)\n" + "="*30 + "\n")
        self.txt_noturno.insert("end", gerar_texto_operacional_turno("18:01", "05:59", "NOTURNO"))

    def atualizar_estrategico(self):
        self.txt_estrat.delete("1.0", "end")
        self.txt_estrat.insert("end", gerar_texto_estrategico())

if __name__ == "__main__":
    app = AppTKX()
    app.mainloop()