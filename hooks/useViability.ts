
import { useState, useMemo, useEffect } from 'react';
import { ScenarioType, SimulationParams, MonthlyResult } from '../types';
import { INITIAL_PARAMS, STORAGE_KEY } from '../constants';
import { calculateProjections, auditYears } from '../services/financeEngine';

export const useViability = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [scenario, setScenario] = useState<ScenarioType>(ScenarioType.REALISTA);
  const [dreYear, setDreYear] = useState<number | 'total'>('total');

  const DEFAULT_VALUES: Record<ScenarioType, SimulationParams> = {
    [ScenarioType.REALISTA]: INITIAL_PARAMS, 
    [ScenarioType.PESSIMISTA]: { 
      ...INITIAL_PARAMS, 
      activeDrivers: 30, avgFare: 16.0, userGrowth: 5, marketingMonthly: 5000,
      initialInvestment: 80000 
    }, 
    [ScenarioType.OTIMISTA]: { 
      ...INITIAL_PARAMS, 
      activeDrivers: 150, avgFare: 22.0, userGrowth: 25, marketingMonthly: 20000,
      initialInvestment: 35000 
    } 
  };

  const [paramsMap, setParamsMap] = useState<Record<ScenarioType, SimulationParams>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garante que todas as chaves de cenário existam, mesmo se o salvo for antigo ou parcial
        return { ...DEFAULT_VALUES, ...parsed };
      } catch (e) {
        console.error("Erro ao carregar parâmetros salvos:", e);
      }
    }
    return DEFAULT_VALUES;
  });

  // Salva automaticamente no LocalStorage sempre que os parâmetros mudarem
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paramsMap));
  }, [paramsMap]);

  const currentParams = paramsMap[scenario];

  // Recalcula as projeções apenas quando os parâmetros mudam (Performance!)
  // Adaptação: Passamos o scenario também, pois o engine precisa dele para definir tetos de frota
  const projections = useMemo(() => calculateProjections(currentParams, scenario), [currentParams, scenario]);
  
  const audits = useMemo(() => auditYears(projections), [projections]);

  const filteredDreResults = useMemo(() => {
    if (dreYear === 'total') return projections;
    return projections.filter(r => r.year === dreYear);
  }, [projections, dreYear]);

  // Lógica de Alertas e Gargalos
  const lastResult = projections[projections.length - 1] || projections[0];
  const getCoverage = (drivers: number, users: number) => users > 0 ? (drivers * 200) / users : 0;
  const coverageIndexFinal = getCoverage(lastResult.drivers, lastResult.users);
  
  const supplyBottleneck = coverageIndexFinal < 0.8 && currentParams.isMaintenanceActive && lastResult.rides > 0;
  const oversupplyWarning = coverageIndexFinal > 5.0 && currentParams.isMaintenanceActive && lastResult.rides > 0;

  const totalMarketingInvest = currentParams.marketingMonthly + currentParams.adesaoTurbo + currentParams.trafegoPago + currentParams.parceriasBares + currentParams.indiqueGanhe;

  const updateParam = (targetScenario: ScenarioType, key: keyof SimulationParams, value: any) => {
    setParamsMap(prev => ({
      ...prev,
      [targetScenario]: { ...prev[targetScenario], [key]: value }
    }));
  };

  // Helper para atualizar o parâmetro do cenário ATUAL (simplifica a chamada na UI)
  const updateCurrentParam = (key: keyof SimulationParams, value: any) => {
    updateParam(scenario, key, value);
  };

  const resetParams = () => setParamsMap(DEFAULT_VALUES);

  return {
    activeTab,
    setActiveTab,
    scenario,
    setScenario,
    dreYear,
    setDreYear,
    paramsMap,           // Necessário para a aba de Comparação de Cenários
    currentParams,       // Parâmetros do cenário ativo
    projections,         // Resultados mensais (MonthlyResult[])
    audits,              // Resumo anual
    filteredDreResults,  // DRE filtrado
    supplyBottleneck,
    oversupplyWarning,
    updateParam,         // Atualiza qualquer cenário
    updateCurrentParam,  // Atualiza cenário atual
    resetParams,
    lastResult,
    totalMarketingInvest,
    calculateProjections // Exposto para recalcular outros cenários na aba 9 se necessário
  };
};
