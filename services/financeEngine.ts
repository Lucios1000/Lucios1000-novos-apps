
import { SimulationParams, ScenarioType, MonthlyResult, YearAudit } from '../types';
import { MONTH_NAMES, FRANCA_STATS } from '../constants';

export const calculateProjections = (
  params: SimulationParams,
  scenario: ScenarioType
): MonthlyResult[] => {
  const results: MonthlyResult[] = [];
  
  // Teto de usuários (curva S, teto especificado)
  const MAX_USERS_SCENARIO = 27398;
  
  // Capacidade máxima de frota por cenário (mantém variação por cenário)
  let driverCap = 2000;
  if (scenario === ScenarioType.PESSIMISTA) driverCap = 800;
  if (scenario === ScenarioType.OTIMISTA) driverCap = 3000;

  let currentDrivers = params.activeDrivers;
  let currentUsers = params.activeDrivers > 0 ? params.activeDrivers * 50 : 100; 
  let accumulatedProfit = -params.initialInvestment;

  // Crescimento em S por faixas de meses
  const getStageGrowth = (monthNumber: number) => {
    if (monthNumber <= 6) return 0.07; // meses 1-6: 7%
    if (monthNumber <= 24) return 0.15; // meses 7-24: 15%
    return 0.04; // meses 25-36: 4%
  };

  for (let m = 0; m < 36; m++) {
    const year = 2026 + Math.floor(m / 12);
    const monthIndex = m % 12;

    // Se a manutenção estiver desligada, zerar tudo conforme solicitado
    if (!params.isMaintenanceActive) {
      results.push({
        month: m + 1,
        year,
        monthName: MONTH_NAMES[monthIndex],
        drivers: 0,
        users: 0,
        rides: 0,
        grossRevenue: 0,
        takeRateGross: 0,
        cashback: 0,
        takeRateRevenue: 0,
        taxes: 0,
        variableCosts: 0, 
        fixedCosts: 0,
        marketing: 0,
        tech: 0, 
        campaignCosts: 0,
        ebitda: 0,
        netProfit: 0,
        accumulatedProfit: -params.initialInvestment, // O investimento inicial permanece gasto
        margin: 0,
        contributionMargin: 0,
        cac: 0,
        ltv: 0,
        grossPerDriver: 0,
        netPerDriver: 0,
        ridesPerDriver: 0,
        ridesPerDriverDay: 0
      });
      continue;
    }

    const previousUsers = currentUsers;
    const stageGrowth = getStageGrowth(m + 1);
    const saturationFactor = Math.max(0, 1 - (currentUsers / MAX_USERS_SCENARIO));
    const effectiveGrowthRate = stageGrowth * saturationFactor;
    currentUsers = Math.min(MAX_USERS_SCENARIO, currentUsers * (1 + effectiveGrowthRate));
    
    const newUsersNet = currentUsers - previousUsers;
    const userChurnRate = (params.churnRate || 2) / 100;
    const grossNewUsers = newUsersNet + (previousUsers * userChurnRate);

    // Frota: início e adição mensal (sem churn no modelo)
    currentDrivers += (params.driverAdditionMonthly || 0);
    currentDrivers = Math.min(driverCap, currentDrivers);

    // AJUSTE OPERACIONAL: Produtividade Ponderada da Frota
    // MPD (Média de Produtividade Diária): 10,1 corridas/dia por motorista
    // Reflete mix: 30% Full-time, 40% Part-time, 30% Esporádico
    const MPD = 10.1; // corridas/dia/motorista cadastrado
    const workingDaysPerMonth = 30.5; // dias úteis médios
    
    // Demanda de Usuários (com sazonalidade)
    let demandedRides = currentUsers * (params.ridesPerUserMonth || 4.2);

    // Sazonalidade: -15% Jan/Jul, +20% Dez
    if (monthIndex === 0 || monthIndex === 6) { // Janeiro, Julho
      demandedRides *= 0.85;
    } else if (monthIndex === 11) { // Dezembro
      demandedRides *= 1.20;
    }
    
    // Capacidade da Frota (com MPD 10,1)
    const supplyCapacity = currentDrivers * MPD * workingDaysPerMonth;
    
    // GMV LIMITADO: Faturamento mensal = MIN(demanda, capacidade)
    const actualRides = Math.min(demandedRides, supplyCapacity);
    const isSupplyBottleneck = demandedRides > supplyCapacity;
    const demandGap = isSupplyBottleneck ? demandedRides - supplyCapacity : 0;
    const ridesPM = currentDrivers > 0 ? actualRides / currentDrivers : 0;

    // Receita: take rate nominal 15%, média ponderada efetiva 13,2% (meritocracia)
    const grossRevenue = actualRides * params.avgFare;
    const takeRateGross = grossRevenue * 0.15; // nominal
    const takeRateRevenue = grossRevenue * 0.132; // efetivo (13,2%)
    const cashback = takeRateGross - takeRateRevenue; // devolução ao motorista

    // CONDIÇÃO: Se Volume de Corridas for 0, zerar impostos, taxas e marketing
    let taxes = 0;
    let variableCosts = 0;
    let totalMarketing = 0;
    const campaignCosts = 0; // não considerado no novo modelo
    let totalTech = 0;

    // Impostos: 11,2% sobre Receita Bruta da TKX (takeRateGross)
    taxes = takeRateGross * 0.112;

    // Marketing (CAC): base condicional (R$3.000) + 1,50 por NOVO usuário adicionado
    // + investimento em campanhas específicas
    const newUsersAdded = Math.max(0, currentUsers - previousUsers);
    const marketingBase = params.applyMinimumCosts ? 3000 : 0;
    const campaignSpend = (params.adesaoTurbo || 0) + (params.trafegoPago || 0) + 
                          (params.parceriasBares || 0) + (params.indiqueGanhe || 0);
    const totalMarketingInvestment = marketingBase + (1.5 * newUsersAdded) + campaignSpend;
    totalMarketing = totalMarketingInvestment;

    // Tecnologia/APIs: 0,15 por corrida
    totalTech = actualRides * 0.15;

    // Bancário/Gateway: 0,40 por corrida + 2% sobre GMV
    const bankFees = (actualRides * 0.40) + (grossRevenue * 0.02);
    variableCosts = bankFees;
    
    // Fixos escalonados: base condicional (R$8.000) e +50% a cada semestre
    const semestersPassed = Math.floor(m / 6);
    const fixedBase = params.applyMinimumCosts ? 8000 : 0;
    const currentFixedCosts = fixedBase * Math.pow(1.5, semestersPassed);
    
    // CUSTOS DE FIDELIDADE TKX DYNAMIC CONTROL
    // Elite Drivers: Semestral (meses 6, 12, 18, 24, 30, 36)
    const eliteDriversCost = (m > 0 && (m + 1) % 6 === 0) ? params.eliteDriversSemestral : 0;
    // Fidelidade Passageiros: Anual (meses 12, 24, 36)
    const fidelidadePassageirosCost = (m > 0 && (m + 1) % 12 === 0) ? params.fidelidadePassageirosAnual : 0;
    // Reserva Operacional: Percentual do GMV (mensal)
    const reservaOperacionalCost = grossRevenue * (params.reservaOperacionalGMV / 100);
    
    const totalFidelityCosts = eliteDriversCost + fidelidadePassageirosCost + reservaOperacionalCost;
    
    const ebitda = takeRateRevenue - taxes - variableCosts - currentFixedCosts - totalTech - totalMarketing - totalFidelityCosts;
    const netProfit = ebitda; 
    
    accumulatedProfit += netProfit;

    // LTV Dinâmico: Margem de Contribuição Média por Usuário / Taxa de Churn
    // Margem de Contribuição = Receita (TKX) - Impostos - Custos Variáveis
    const contributionMarginVal = takeRateRevenue - taxes - variableCosts;
    const avgMarginPerUser = currentUsers > 0 ? contributionMarginVal / currentUsers : 0;
    const ltv = userChurnRate > 0 ? avgMarginPerUser / userChurnRate : 0;
    
    // CAC Realista: Total de Investimento em Marketing / Número de Novos Usuários Adquiridos
    // Inclui base fixa, variável por usuário, e campanhas específicas
    const grossNewUsersForCAC = Math.max(newUsersAdded, 0.1); // evita divisão por zero
    const cac = grossNewUsersForCAC > 0 ? totalMarketingInvestment / grossNewUsersForCAC : 0;

    results.push({
      month: m + 1,
      year,
      monthName: MONTH_NAMES[monthIndex],
      drivers: Math.round(currentDrivers),
      users: Math.round(currentUsers),
      rides: Math.round(actualRides),
      grossRevenue,
      takeRateGross,
      cashback,
      takeRateRevenue,
      taxes,
      variableCosts, 
      fixedCosts: currentFixedCosts,
      marketing: totalMarketing,
      tech: totalTech, 
      campaignCosts,
      eliteDriversCost,
      fidelidadePassageirosCost,
      reservaOperacionalCost,
      ebitda,
      netProfit,
      accumulatedProfit,
      margin: takeRateRevenue > 0 ? (netProfit / takeRateRevenue) * 100 : 0,
      contributionMargin: takeRateRevenue > 0 ? (contributionMarginVal / takeRateRevenue) * 100 : 0,
      cac,
      ltv,
      grossPerDriver: currentDrivers > 0 ? grossRevenue / currentDrivers : 0,
      netPerDriver: currentDrivers > 0 ? (grossRevenue - takeRateRevenue) / currentDrivers : 0,
      ridesPerDriver: ridesPM,
      ridesPerDriverDay: ridesPM / 30,
      supplyCapacity,
      demandedRides,
      isSupplyBottleneck,
      demandGap,
      newUsersAdded
    });
  }

  return results;
};

export const auditYears = (results: MonthlyResult[]): YearAudit[] => {
  const audits: YearAudit[] = [];
  const years = [...new Set(results.map(r => r.year))];
  
  years.forEach((y, i) => {
    const data = results.filter(r => r.year === y);
    if (data.length === 0) return;
    
    const totalGMV = data.reduce((a, b) => a + b.grossRevenue, 0);
    const totalRev = data.reduce((a, b) => a + b.takeRateRevenue, 0);
    const totalCashback = data.reduce((a, b) => a + b.cashback, 0);
    const totalProfit = data.reduce((a, b) => a + b.netProfit, 0);
    const totalEbitda = data.reduce((a, b) => a + b.ebitda, 0);
    const totalRides = data.reduce((a, b) => a + b.rides, 0);
    
    const totalOpCosts = data.reduce((a, b) => a + b.marketing + b.tech + b.variableCosts, 0);
    const endUsers = data[data.length - 1].users;
    const endDrivers = data[data.length - 1].drivers;
    const avgMonthlyRides = totalRides / data.length;
    
    audits.push({
      year: y,
      totalGMV,
      totalRevenue: totalRev,
      totalCashback,
      totalNetProfit: totalProfit,
      totalEbitda,
      totalRides,
      avgMonthlyProfit: totalProfit / data.length,
      avgRidesPerDriverDay: data.reduce((a, b) => a + b.ridesPerDriverDay, 0) / data.length,
      growthFromPrev: i === 0 ? 0 : (audits[i-1] && audits[i-1].totalRevenue > 0 ? ((totalRev - audits[i-1].totalRevenue) / audits[i-1].totalRevenue) * 100 : 0),
      bestMonth: [...data].sort((a,b) => b.netProfit - a.netProfit)[0].monthName,
      worstMonth: [...data].sort((a,b) => a.netProfit - b.netProfit)[0].monthName,
      endUsers,
      endDrivers,
      avgMonthlyRides,
      totalOpCosts
    });
  });
  return audits;
};
