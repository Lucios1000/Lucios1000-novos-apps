import os
import sys
import subprocess

def executar_script(nome_arquivo):
    try:
        subprocess.run([sys.executable, nome_arquivo])
        input("\nTarefa concluída. Pressione ENTER para retornar...")
    except Exception as e:
        print(f"\n❌ Erro ao abrir {nome_arquivo}: {e}")
        input("Pressione ENTER...")

def exibir_menu():
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        print("\n" + "="*60)
        print("      SISTEMA DE GESTÃO TKX - FRANCA (BI ATIVADO)")
        print("="*60)
        print("[1] Cadastrar Motorista/Cliente")
        print("[2] Consultar Base (Quem está cadastrado)")
        print("[3] Simular Preço de Corrida (Dinâmicas)")
        print("[4] Relatório de Repasse (Pagamento)")
        print("[5] Dashboard Financeiro (Lucro Líquido)")
        print("[6] Gerar Recibo de Corrida")
        print("-" * 60)
        print("[7] BI OPERACIONAL (Performance 06h-18h / 18h-06h)")
        print("[8] BI ESTRATÉGICO (RX de Lucro, Mercado e Clientes)")
        print("-" * 60)
        print("[0] Sair")
        print("="*60)
        
        opcao = input("Escolha uma opção: ")

        scripts = {
            '1': 'cadastro_tkx.py', '2': 'consultar_base.py',
            '3': 'simulador_preco.py', '4': 'relatorio_repasse.py',
            '5': 'dashboard_financeiro.py', '6': 'gerar_recibo.py',
            '7': 'bi_operacional.py', '8': 'bi_estrategico.py'
        }

        if opcao == '0':
            print("Saindo... TKX operando com sucesso!")
            break
        elif opcao in scripts:
            if os.path.exists(scripts[opcao]):
                executar_script(scripts[opcao])
            else:
                print(f"\n❌ Arquivo {scripts[opcao]} não encontrado!")
                input("Pressione ENTER...")
        else:
            print("⚠️ Opção inválida!")
            input("Pressione ENTER...")

if __name__ == "__main__":
    exibir_menu()