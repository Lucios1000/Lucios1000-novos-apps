
export enum ScenarioType {
  REALISTA = 'Realista',
  PESSIMISTA = 'Pessimista',
  OTIMISTA = 'Otimista'
}

export interface SimulationParams {
  ridesPerDriverDay: number;
  avgFare: number;
  takeRate: number;
  activeDrivers: number;
  driverAdditionMonthly: number;
  ridesPerUserMonth: number; // Novo: Frequência de uso por usuário
  initialRides: number;
  fixedCosts: number;
  userGrowth: number;
  initialInvestment: number;
  marketingMonthly: number;
  techMonthly: number;
  cancellationRate: number;
  driverGrowth: number;
  
  // Marketing Campaigns
  adesaoTurbo: number;
  trafegoPago: number;
  parceriasBares: number;
  indiqueGanhe: number;

  // Operational Params
  apiMaintenanceRate: number;
  chargebackReserveRate: number;
  churnRate: number;
  bankFeeRate: number; // Novo: Taxa bancária em %
  isMaintenanceActive: boolean; // Novo: Interruptor de custos de manutenção
  applyMinimumCosts: boolean; // Toggle para ativar/desativar custos mínimos fixos e marketing
  
  // Campanhas de Fidelidade TKX Dynamic Control
  eliteDriversSemestral: number;  // R$ 10.000 base semestral para 20 motoristas
  fidelidadePassageirosAnual: number;  // R$ 5.000 base anual (Sorteio iPhone)
  reservaOperacionalGMV: number;  // 1% do GMV para cashbacks e experiências
}

export interface MonthlyResult {
  month: number;
  year: number;
  monthName: string;
  drivers: number;
  users: number; 
  rides: number;
  grossRevenue: number;
  takeRateGross: number; // 15% fixo na fonte
  cashback: number; // Diferença devolvida ao motorista
  takeRateRevenue: number; // Receita líquida TKX
  taxes: number;
  variableCosts: number;
  fixedCosts: number;
  marketing: number;
  tech: number;
  campaignCosts: number;
  // Custos de Fidelidade (para exibição transparente)
  eliteDriversCost: number;
  fidelidadePassageirosCost: number;
  reservaOperacionalCost: number;
  ebitda: number;
  netProfit: number;
  accumulatedProfit: number;
  margin: number;
  contributionMargin: number;
  cac: number; // CAC Realista: Marketing Total / Novos Usuários
  ltv: number; // LTV Dinâmico: Margem por Usuário / Churn Rate
  grossPerDriver: number;
  netPerDriver: number;
  ridesPerDriver: number; 
  ridesPerDriverDay: number;
  supplyCapacity?: number; // Capacidade da frota (MPD * dias * motoristas)
  demandedRides?: number; // Demanda dos usuários
  isSupplyBottleneck?: boolean; // Indica se frota está limitando crescimento
  demandGap?: number; // Gap entre demanda e capacidade
  newUsersAdded?: number; // Novos usuários adicionados no mês
}

export interface YearAudit {
  year: number;
  totalGMV: number;
  totalRevenue: number;
  totalCashback: number;
  totalNetProfit: number;
  totalEbitda: number;
  totalRides: number;
  avgMonthlyProfit: number;
  avgRidesPerDriverDay: number;
  growthFromPrev: number;
  bestMonth: string;
  worstMonth: string;
  // Novos campos para visão executiva
  endUsers: number;
  endDrivers: number;
  avgMonthlyRides: number;
  totalOpCosts: number;
}
