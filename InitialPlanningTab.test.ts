import { describe, it, expect } from 'vitest';
import { calculateTechnicalTicket } from './InitialPlanningTab';

describe('Cálculo do Ticket Técnico (Unit Economics)', () => {
  // Cenário 1: Corrida padrão onde o custo técnico supera a tarifa mínima
  it('deve calcular o custo base corretamente (sem dinâmica)', () => {
    const baseFare = 10.00; // Valor inicial (não usado diretamente na lógica de excedente, mas passado)
    const costPerKm = 2.43;
    const avgDistance = 5; 
    const costPerMin = 0; // Ignorado
    const avgTime = 10; 
    const minFare = 11.50;
    const dynamic = 1.0;
    const includedKm = 1.5;

    // Cálculo esperado: 10.00 (Base) + (5 - 1.5) * 2.43 = 10.00 + 3.5 * 2.43 = 10.00 + 8.505 = 18.505
    const result = calculateTechnicalTicket(baseFare, costPerKm, avgDistance, costPerMin, avgTime, minFare, dynamic, includedKm);
    expect(result).toBeCloseTo(18.505, 3);
  });

  // Cenário 2: Corrida curta onde a tarifa mínima deve prevalecer
  it('deve aplicar a tarifa mínima quando o custo calculado for menor', () => {
    const baseFare = 10.00;
    const costPerKm = 2.43;
    const avgDistance = 1; // Menor que includedKm (1.5)
    const costPerMin = 0;
    const avgTime = 2;
    const minFare = 11.50; 
    const dynamic = 1.0;
    const includedKm = 1.5;

    // Distância <= IncludedKm -> MinFare
    const result = calculateTechnicalTicket(baseFare, costPerKm, avgDistance, costPerMin, avgTime, minFare, dynamic, includedKm);
    expect(result).toBe(11.50);
  });

  // Cenário 3: Aplicação de Dinâmica (ex: Madrugada)
  it('deve multiplicar o resultado final pelo fator dinâmico', () => {
    // Usando os mesmos valores do Cenário 1 (Base 15.00)
    // Dinâmica de 1.4x
    // Base calculation: 20.005
    const result = calculateTechnicalTicket(10.00, 2.43, 5, 0, 10, 11.50, 1.4, 1.5);
    
    // Esperado: 20.005 * 1.4 = 28.007
    expect(result).toBeCloseTo(28.007, 3);
  });

  // Cenário 4: Distância Zero (Robustez)
  it('deve garantir que a tarifa mínima prevalece sobre o valor inicial (baseFare) quando a distância é zero', () => {
    const baseFare = 10.00; 
    const costPerKm = 2.43;
    const avgDistance = 0; 
    const costPerMin = 0;
    const avgTime = 0;
    const minFare = 11.50;
    const dynamic = 1.0;
    const includedKm = 1.5;

    // Mesmo com distância 0, o custo deve ser a tarifa mínima (que cobre os primeiros 1.5km)
    const result = calculateTechnicalTicket(baseFare, costPerKm, avgDistance, costPerMin, avgTime, minFare, dynamic, includedKm);
    expect(result).toBe(11.50);
  });
});
