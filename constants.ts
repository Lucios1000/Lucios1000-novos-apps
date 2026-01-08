import { ScenarioType, SimulationParams } from './types';

export const FRANCA_STATS = {
  population: 355919,
  digitalUsers: 182700, // SAM: Mercado Endereçável Total em Franca-SP
  area: 605.679,
  avgDistance: 5.8, // km
  marketShareTarget: 15.0, // Meta estratégica de 15%
  somTarget: 27400, // Teto operacional SOM (15% do SAM)
  marketPlayers: [
    { name: 'Uber', share: 50, ticket: 20.00, focus: 'Global / Volume', satisfaction: 2, rides: 411000 },
    { name: '99', share: 20, ticket: 18.00, focus: 'Preço / Global', satisfaction: 3, rides: 164000 },
    { name: 'Maxim', share: 18, ticket: 14.80, focus: 'Preço Baixo / Regional', satisfaction: 3, rides: 148000 },
    { name: 'Garupa', share: 5, ticket: 21.00, focus: 'Regional / Sul', satisfaction: 4, rides: 41000 },
    { name: 'Urban 66', share: 5, ticket: 17.50, focus: 'Local / Fusão', satisfaction: 4, rides: 41000 },
    { name: 'TKX Franca', share: 2, ticket: 18.50, focus: 'Humanização / Meritocracia', satisfaction: 5, rides: 16400 }
  ]
};

// Parâmetros de fallback (Padrão Realista Base) - Ajustado para Frota 44 + 10/mês para escala
export const INITIAL_PARAMS: SimulationParams = {
  ridesPerDriverDay: 15, 
  avgFare: 18.5,
  takeRate: 15,          
  activeDrivers: 44, 
  driverAdditionMonthly: 10,
  ridesPerUserMonth: 4.2, 
  initialRides: 14000, 
  fixedCosts: 6200,
  userGrowth: 15,
  initialInvestment: 0,
  marketingMonthly: 11000,
  techMonthly: 3000,
  cancellationRate: 3,
  driverGrowth: 5,
  
  // Campaigns
  adesaoTurbo: 3000,
  trafegoPago: 4000,
  mktMensalOff: 2000,
  parceriasBares: 6000,
  indiqueGanhe: 1500,

  // Operational
  apiMaintenanceRate: 0.3,
  chargebackReserveRate: 1,
  churnRate: 2,
  bankFeeRate: 3.0,
  isMaintenanceActive: true,
  applyMinimumCosts: true,
  custoComercialMkt: 8000,
  minCostsEnabled: true,
  
  // Campanhas de Fidelidade TKX Dynamic Control
  eliteDriversSemestral: 10000,
  fidelidadePassageirosAnual: 5000,
  reservaOperacionalGMV: 2.0,
  
  // Meritocracia (Mix de Motoristas)
  takeRateEfetivo: 13.2,

  // Inputs Estratégicos (defaults)
  selectedCityId: undefined,
  selectedCityName: undefined,
  cityPopulation: FRANCA_STATS.population,
  samPopulation: Math.round(FRANCA_STATS.population * 0.5),
  marketShareTarget: FRANCA_STATS.marketShareTarget,
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const STORAGE_KEY = 'tkx_simulation_params';
