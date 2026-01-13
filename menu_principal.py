import os

def exibir_menu():
    while True:
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

        if opcao == '1':
            os.system('python cadastro_tkx.py')
        elif opcao == '2':
            os.system('python consultar_base.py')
        elif opcao == '3':
            os.system('python simulador_preco.py')
        elif opcao == '4':
            os.system('python relatorio_repasse.py')
        elif opcao == '5':
            os.system('python dashboard_financeiro.py')
        elif opcao == '6':
            os.system('python gerar_recibo.py')
        elif opcao == '0':
            print("Saindo... TKX operando com sucesso!")
            break
        else:
            print("Opção inválida! Tente novamente.")

if __name__ == "__main__":
    exibir_menu()