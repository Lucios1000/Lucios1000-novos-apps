import os
import sys
import subprocess

def executar_script(nome_arquivo):
    try:
        # Garante a execução usando o interpretador atual
        subprocess.run([sys.executable, nome_arquivo])
        input("\nTarefa concluída. Pressione ENTER para voltar ao menu...")
    except Exception as e:
        print(f"\n❌ Erro ao abrir {nome_arquivo}: {e}")
        input("Pressione ENTER...")

def exibir_menu():
    while True:
        # Limpa a tela para o menu ficar sempre no topo
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print("\n" + "="*40)
        print("      SISTEMA DE GESTÃO TKX - FRANCA")
        print("="*40)
        print("[1] Cadastrar Motorista/Cliente")
        print("[2] Consultar Base (Quem está cadastrado)")
        print("[3] Simular Preço de Corrida (Dinâmicas)")
        print("[4] Relatório de Repasse (Pagamento)")
        print("[5] Dashboard Financeiro (Lucro Líquido)")
        print("[6] Gerar Recibo de Corrida")
        print("[0] Sair")
        print("="*40)
        
        opcao = input("Escolha uma opção: ")

        scripts = {
            '1': 'cadastro_tkx.py',
            '2': 'consultar_base.py',
            '3': 'simulador_preco.py',
            '4': 'relatorio_repasse.py',
            '5': 'dashboard_financeiro.py',
            '6': 'gerar_recibo.py'
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
            print("⚠️ Opção inválida! Digite apenas o número.")
            input("Pressione ENTER...")

if __name__ == "__main__":
    exibir_menu()