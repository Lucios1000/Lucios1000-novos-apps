import React, { useMemo, useState, useEffect, Suspense, lazy } from 'react';
import { MapPin, Clock, Zap, Wallet, Users, Car, Briefcase, TrendingUp, DollarSign, Activity, Target, Globe, Database, Save, Trash2, FolderOpen } from 'lucide-react';
import Layout from './components/Layout';
import SnapshotModal from './components/SnapshotModal';
const ComparisonTab = React.lazy(() => import('./components/ComparisonTab'));
import { ImplementationTab } from './ImplementationTab';
import { InitialPlanningTab } from './InitialPlanningTab';
import { SensitivityAnalysisTab } from './SensitivityAnalysisTab';
const TrendAnalysisTab = React.lazy(() => import('./components/TrendAnalysisTab'));
const AITab = React.lazy(() => import('./components/AITab'));
const TestTab = React.lazy(() => import('./components/TestTab'));
// Wrapper para lazy loading com fallback
const LazyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div style={{color:'#fff',textAlign:'center',marginTop:40}}>Carregando...</div>}>
    {children}
  </Suspense>
);
import { useViability } from './hooks/useViability';
import { useSnapshots } from './hooks/useSnapshots';
import { ScenarioType, MonthlyResult } from './types';
import { FRANCA_STATS } from './constants';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { DarkTooltip, NeutralLegend } from './components/ChartUI';

const formatCurrency = (value?: number) =>
  typeof value === 'number'
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : '—';

const formatNumber = (value?: number) =>
  typeof value === 'number' ? value.toLocaleString('pt-BR') : '—';

const formatPercent = (value?: number, digits = 1) =>
  typeof value === 'number' ? `${value.toFixed(digits)}%` : '—';

// Componentes para renderização refinada
const CurrencyDisplay: React.FC<{ value?: number; colorClass?: string; abs?: boolean }> = ({ value, colorClass = 'text-yellow-300', abs = false }) => {
  const displayValue = typeof value === 'number' && abs ? Math.abs(value) : value;
  return <span className={`font-mono text-sm font-semibold ${colorClass}`}>{formatCurrency(displayValue)}</span>;
};

const NumberDisplay: React.FC<{ value?: number }> = ({ value }) => (
  <span className="font-mono text-sm font-semibold text-slate-100">{formatNumber(value)}</span>
);

const PercentDisplay: React.FC<{ value?: number; digits?: number }> = ({ value, digits = 1 }) => (
  <span className="font-mono text-sm font-semibold">{formatPercent(value, digits)}</span>
);

const profitLabel = (value?: number, positiveLabel = 'Lucro', negativeLabel = 'Prejuízo') =>
  typeof value === 'number' && value < 0 ? negativeLabel : positiveLabel;

const profitColor = (value?: number, positiveClass = 'text-green-400', negativeClass = 'text-red-400') =>
  typeof value === 'number' && value < 0 ? negativeClass : positiveClass;

const profitValue = (value?: number) => (typeof value === 'number' ? Math.abs(value) : value);

const SCENARIO_LABEL: Record<ScenarioType, string> = {
  [ScenarioType.REALISTA]: 'Realista',
  [ScenarioType.PESSIMISTA]: 'Pessimista',
  [ScenarioType.OTIMISTA]: 'Otimista',
};

const PLAYER_COLORS: Record<string, string> = {
  // Paleta solicitada: preto, laranja, amarelo, branco, vermelho
  Uber: '#0b1220',
  '99': '#f59e0b',
  Maxim: '#eab308',
  Garupa: '#e5e7eb',
  'Urban 66': '#ef4444',
  'TKX Franca': '#fbbf24',
};


const PARAM_SLIDERS: Array<{
  key: keyof MonthlyResult | string;
  label: string;
  paramKey: keyof ReturnType<typeof useViability>['currentParams'];
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  { key: 'initialInvestment', label: 'Investimento Inicial (R$)', paramKey: 'initialInvestment', min: 0, max: 200000, step: 1000 },
  { key: 'activeDrivers', label: 'Frota Inicial', paramKey: 'activeDrivers', min: 1, max: 500, step: 1, unit: ' condutores' },
  { key: 'driverAdditionMonthly', label: 'Adição Mensal de Frota', paramKey: 'driverAdditionMonthly', min: 0, max: 100, step: 1, unit: ' condutores' },
  { key: 'avgFare', label: 'Tarifa Média (R$)', paramKey: 'avgFare', min: 10, max: 50, step: 0.5 },
  { key: 'ridesPerUserMonth', label: 'Corridas por Usuário/mês', paramKey: 'ridesPerUserMonth', min: 1, max: 10, step: 0.1 },
  { key: 'userGrowth', label: 'Crescimento de Usuários (%)', paramKey: 'userGrowth', min: 0, max: 30, step: 1, unit: '%' },
  { key: 'custoComercialMkt', label: 'Custo Comercial + MKT (R$)', paramKey: 'custoComercialMkt', min: 0, max: 50000, step: 100 },
];

const MKT_SLIDERS: Array<{
  label: string;
  paramKey: keyof ReturnType<typeof useViability>['currentParams'];
  min: number;
  max: number;
  step: number;
}> = [
  { label: 'Despesas Básicas', paramKey: 'fixedCosts', min: 0, max: 50000, step: 100 },
  { label: 'Marketing (R$)', paramKey: 'marketingMonthly', min: 0, max: 50000, step: 100 },
  { label: 'Taxa de Tecnologia (% do GMV)', paramKey: 'techFeePct', min: 0, max: 10, step: 0.1 },
  { label: 'Marketing Mídia OFF Mensal (R$)', paramKey: 'mktMensalOff', min: 0, max: 10000, step: 100 },
  { label: 'Adesão Turbo (R$)', paramKey: 'adesaoTurbo', min: 0, max: 10000, step: 100 },
  { label: 'Tráfego Pago (R$)', paramKey: 'trafegoPago', min: 0, max: 10000, step: 100 },
  { label: 'Parcerias Bares, Casas Noturnas, Influencers, Eventos(R$)', paramKey: 'parceriasBares', min: 0, max: 20000, step: 100 },
  { label: 'Indique/Ganhe (R$)', paramKey: 'indiqueGanhe', min: 0, max: 10000, step: 100 },
];

const FIDELITY_SLIDERS: Array<{
  label: string;
  paramKey: keyof ReturnType<typeof useViability>['currentParams'];
  min: number;
  max: number;
  step: number;
  description: string;
}> = [
  { label: 'Elite Drivers (Semestral)', paramKey: 'eliteDriversSemestral', min: 0, max: 30000, step: 1000, description: 'R$ 10.000 base para 20 melhores motoristas' },
  { label: 'Fidelidade Passageiros (Anual)', paramKey: 'fidelidadePassageirosAnual', min: 0, max: 15000, step: 500, description: 'Sorteio iPhone e experiências VIP' },
  { label: 'Reserva Operacional (% Lucro Líq.)', paramKey: 'reservaOperacionalGMV', min: 0, max: 5, step: 0.1, description: 'Cashbacks e gatilhos de milha' },
];

// Dados Operacionais (Mês 1 ao 36)
const OPERATIONAL_GROWTH = [
  { month: 1, phase: 'Lançamento', users: 400, ridesDay: 56, drivers: 5 },
  { month: 2, phase: 'Consolidação', users: 806, ridesDay: 113, drivers: 10 },
  { month: 3, phase: 'Consolidação', users: 1212, ridesDay: 170, drivers: 15 },
  { month: 4, phase: 'Consolidação', users: 1618, ridesDay: 227, drivers: 20 },
  { month: 5, phase: 'Consolidação', users: 2024, ridesDay: 283, drivers: 25 },
  { month: 6, phase: 'Consolidação Inicial', users: 2430, ridesDay: 340, drivers: 30 },
  { month: 7, phase: 'Expansão', users: 3225, ridesDay: 452, drivers: 39 },
  { month: 8, phase: 'Expansão', users: 4020, ridesDay: 563, drivers: 49 },
  { month: 9, phase: 'Expansão', users: 4815, ridesDay: 674, drivers: 59 },
  { month: 10, phase: 'Expansão', users: 5610, ridesDay: 785, drivers: 68 },
  { month: 11, phase: 'Expansão', users: 6405, ridesDay: 897, drivers: 78 },
  { month: 12, phase: 'Expansão Bairros', users: 7200, ridesDay: 1008, drivers: 88 },
  { month: 13, phase: 'Crescimento', users: 7917, ridesDay: 1108, drivers: 96 },
  { month: 14, phase: 'Crescimento', users: 8634, ridesDay: 1209, drivers: 105 },
  { month: 15, phase: 'Crescimento', users: 9351, ridesDay: 1309, drivers: 114 },
  { month: 16, phase: 'Crescimento', users: 10068, ridesDay: 1410, drivers: 123 },
  { month: 17, phase: 'Crescimento', users: 10785, ridesDay: 1510, drivers: 131 },
  { month: 18, phase: 'Crescimento', users: 11500, ridesDay: 1610, drivers: 140 },
  { month: 19, phase: 'Tração', users: 12217, ridesDay: 1710, drivers: 149 },
  { month: 20, phase: 'Tração', users: 12934, ridesDay: 1811, drivers: 157 },
  { month: 21, phase: 'Tração', users: 13651, ridesDay: 1911, drivers: 166 },
  { month: 22, phase: 'Tração', users: 14368, ridesDay: 2012, drivers: 175 },
  { month: 23, phase: 'Tração', users: 15085, ridesDay: 2112, drivers: 184 },
  { month: 24, phase: 'Maturidade', users: 15800, ridesDay: 2212, drivers: 192 },
  { month: 25, phase: 'Estabilização', users: 16508, ridesDay: 2311, drivers: 201 },
  { month: 26, phase: 'Estabilização', users: 17216, ridesDay: 2410, drivers: 210 },
  { month: 27, phase: 'Estabilização', users: 17924, ridesDay: 2509, drivers: 218 },
  { month: 28, phase: 'Estabilização', users: 18632, ridesDay: 2608, drivers: 227 },
  { month: 29, phase: 'Estabilização', users: 19340, ridesDay: 2708, drivers: 235 },
  { month: 30, phase: 'Estabilização', users: 20050, ridesDay: 2807, drivers: 244 },
  { month: 31, phase: 'Estabilidade', users: 20758, ridesDay: 2906, drivers: 253 },
  { month: 32, phase: 'Estabilidade', users: 21466, ridesDay: 3005, drivers: 261 },
  { month: 33, phase: 'Estabilidade', users: 22174, ridesDay: 3104, drivers: 270 },
  { month: 34, phase: 'Estabilidade', users: 22882, ridesDay: 3203, drivers: 279 },
  { month: 35, phase: 'Estabilidade', users: 23590, ridesDay: 3303, drivers: 287 },
  { month: 36, phase: 'Estabilidade (SOM)', users: 24300, ridesDay: 3402, drivers: 296 },
];

const DRIVER_PROFILES = [
  { name: 'Full-Time', count: 89, desc: 'Dia todo (Grosso das corridas)', color: '#22c55e' },
  { name: 'Part-Time', count: 118, desc: 'Horários de pico (Reforço)', color: '#eab308' },
  { name: 'Esporádicos', count: 89, desc: 'Noites/Fim de semana/Eventos', color: '#3b82f6' },
];

interface DashboardProps {
  worldMode: 'Virtual' | 'Real';
  toggleWorld: () => void;
}

const DashboardContent: React.FC<DashboardProps> = ({ worldMode, toggleWorld }) => {
  const [modo, setModo] = useState<'Simulação' | 'Real'>('Simulação');
  const {
    activeTab,
    setActiveTab,
    scenario,
    setScenario,
    currentParams,
    projections,
    audits,
    filteredDreResults,
    updateCurrentParam,
    updateScenarioParam,
    resetParams,
    toggleMinCosts,
    supplyBottleneck,
    oversupplyWarning,
    paramsMap,
    calculateProjections, // Esta é a função que chamaremos com o 'modo'
  } = useViability();

  const {
    snapshots,
    saveSnapshot,
    deleteSnapshot,
    renameSnapshot,
    exportSnapshots,
    exportSingleSnapshot,
    importSnapshots,
    duplicateSnapshot,
  } = useSnapshots();

  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [yearPeriod, setYearPeriod] = useState<1 | 2 | 3>(1);
  // Festas/Eventos
  const [eventStartStr, setEventStartStr] = useState<string>('');
  const [eventEndStr, setEventEndStr] = useState<string>('');
  const [dynamicPct, setDynamicPct] = useState<number>(0);
  const [ridesExtraPct, setRidesExtraPct] = useState<number>(0);
  const [driversNeeded, setDriversNeeded] = useState<number>(0);
  const [distributionMode, setDistributionMode] = useState<'constante' | 'curvaS'>('constante');
  const [curveIntensity, setCurveIntensity] = useState<number>(0.45);
  const [peakPosition, setPeakPosition] = useState<number>(0.5);

  // Campanhas: suspensão/restauração com persistência por cenário
  const [campaignsSuspendedMap, setCampaignsSuspendedMap] = useState<Record<ScenarioType, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tkx_campaigns_suspended');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { [ScenarioType.REALISTA]: false, [ScenarioType.PESSIMISTA]: false, [ScenarioType.OTIMISTA]: false };
  });
  const [campaignsBackupMap, setCampaignsBackupMap] = useState<Record<ScenarioType, {
    adesaoTurbo: number;
    parceriasBares: number;
    indiqueGanhe: number;
    eliteDriversSemestral: number;
    fidelidadePassageirosAnual: number;
    reservaOperacionalGMV: number;
  }>>(() => {
    try {
      const saved = localStorage.getItem('tkx_campaigns_backup');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      [ScenarioType.REALISTA]: { adesaoTurbo: 0, parceriasBares: 0, indiqueGanhe: 0, eliteDriversSemestral: 0, fidelidadePassageirosAnual: 0, reservaOperacionalGMV: 0 },
      [ScenarioType.PESSIMISTA]: { adesaoTurbo: 0, parceriasBares: 0, indiqueGanhe: 0, eliteDriversSemestral: 0, fidelidadePassageirosAnual: 0, reservaOperacionalGMV: 0 },
      [ScenarioType.OTIMISTA]: { adesaoTurbo: 0, parceriasBares: 0, indiqueGanhe: 0, eliteDriversSemestral: 0, fidelidadePassageirosAnual: 0, reservaOperacionalGMV: 0 },
    };
  });
  const campaignsSuspended = campaignsSuspendedMap[scenario] || false;
  useEffect(() => {
    try { localStorage.setItem('tkx_campaigns_suspended', JSON.stringify(campaignsSuspendedMap)); } catch {}
  }, [campaignsSuspendedMap]);
  useEffect(() => {
    try { localStorage.setItem('tkx_campaigns_backup', JSON.stringify(campaignsBackupMap)); } catch {}
  }, [campaignsBackupMap]);
  const suspendCampaigns = () => {
    setCampaignsBackupMap(prev => ({
      ...prev,
      [scenario]: {
        adesaoTurbo: currentParams.adesaoTurbo || 0,
        parceriasBares: currentParams.parceriasBares || 0,
        indiqueGanhe: currentParams.indiqueGanhe || 0,
        eliteDriversSemestral: currentParams.eliteDriversSemestral || 0,
        fidelidadePassageirosAnual: currentParams.fidelidadePassageirosAnual || 0,
        reservaOperacionalGMV: currentParams.reservaOperacionalGMV || 0,
      },
    }));
    // Zera apenas os itens de campanhas e fidelidade; mantém marketingMonthly, mktMensalOff, trafegoPago
    updateCurrentParam('adesaoTurbo', 0);
    updateCurrentParam('parceriasBares', 0);
    updateCurrentParam('indiqueGanhe', 0);
    updateCurrentParam('eliteDriversSemestral', 0);
    updateCurrentParam('fidelidadePassageirosAnual', 0);
    updateCurrentParam('reservaOperacionalGMV', 0);
    setCampaignsSuspendedMap(prev => ({ ...prev, [scenario]: true }));
  };
  const restoreCampaigns = () => {
    const backup = campaignsBackupMap[scenario];
    updateCurrentParam('adesaoTurbo', backup?.adesaoTurbo || 0);
    updateCurrentParam('parceriasBares', backup?.parceriasBares || 0);
    updateCurrentParam('indiqueGanhe', backup?.indiqueGanhe || 0);
    updateCurrentParam('eliteDriversSemestral', backup?.eliteDriversSemestral || 0);
    updateCurrentParam('fidelidadePassageirosAnual', backup?.fidelidadePassageirosAnual || 0);
    updateCurrentParam('reservaOperacionalGMV', backup?.reservaOperacionalGMV || 0);
    setCampaignsSuspendedMap(prev => ({ ...prev, [scenario]: false }));
  };

  // --- Presets de Marketing ---
  const [marketingPresets, setMarketingPresets] = useState<any[]>([]);
  const [selectedMarketingPresetId, setSelectedMarketingPresetId] = useState<string>('');
  const [comparePresetId1, setComparePresetId1] = useState<string>('');
  const [comparePresetId2, setComparePresetId2] = useState<string>('');

  // --- Presets de Parametrização ---
  const [paramPresets, setParamPresets] = useState<any[]>([]);
  const [selectedParamPresetId, setSelectedParamPresetId] = useState<string>('');
  const [compareParamPresetId1, setCompareParamPresetId1] = useState<string>('');
  const [compareParamPresetId2, setCompareParamPresetId2] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('tkx_param_presets');
    if (saved) {
      try { setParamPresets(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveParamPreset = () => {
    const name = prompt('Nome do Preset de Parametrização (ex: Cenário Expansão):');
    if (!name?.trim()) return;

    const newPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      date: Date.now(),
      params: {
        initialInvestment: currentParams.initialInvestment,
        activeDrivers: currentParams.activeDrivers,
        driverAdditionMonthly: currentParams.driverAdditionMonthly,
        avgFare: currentParams.avgFare,
        ridesPerUserMonth: currentParams.ridesPerUserMonth,
        userGrowth: currentParams.userGrowth,
        custoComercialMkt: currentParams.custoComercialMkt,
      }
    };

    const updated = [...paramPresets, newPreset];
    setParamPresets(updated);
    localStorage.setItem('tkx_param_presets', JSON.stringify(updated));
    setSelectedParamPresetId(newPreset.id);
  };

  const loadParamPreset = (id: string) => {
    const preset = paramPresets.find(p => p.id === id);
    if (!preset) {
        setSelectedParamPresetId('');
        return;
    }

    Object.entries(preset.params).forEach(([key, value]) => {
      updateCurrentParam(key as any, value as number);
    });
    setSelectedParamPresetId(id);
  };

  const deleteParamPreset = () => {
    if (!selectedParamPresetId || !confirm('Tem certeza que deseja excluir este preset?')) return;
    const updated = paramPresets.filter(p => p.id !== selectedParamPresetId);
    setParamPresets(updated);
    localStorage.setItem('tkx_param_presets', JSON.stringify(updated));
    setSelectedParamPresetId('');
  };

  useEffect(() => {
    const saved = localStorage.getItem('tkx_marketing_presets');
    if (saved) {
      try { setMarketingPresets(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveMarketingPreset = () => {
    const name = prompt('Nome do Preset de Marketing (ex: Estratégia Agressiva):');
    if (!name?.trim()) return;

    const newPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      date: Date.now(),
      params: {
        fixedCosts: currentParams.fixedCosts,
        marketingMonthly: currentParams.marketingMonthly,
        techFeePct: currentParams.techFeePct,
        mktMensalOff: currentParams.mktMensalOff,
        adesaoTurbo: currentParams.adesaoTurbo,
        trafegoPago: currentParams.trafegoPago,
        parceriasBares: currentParams.parceriasBares,
        indiqueGanhe: currentParams.indiqueGanhe,
        eliteDriversSemestral: currentParams.eliteDriversSemestral,
        fidelidadePassageirosAnual: currentParams.fidelidadePassageirosAnual,
        reservaOperacionalGMV: currentParams.reservaOperacionalGMV,
      }
    };

    const updated = [...marketingPresets, newPreset];
    setMarketingPresets(updated);
    localStorage.setItem('tkx_marketing_presets', JSON.stringify(updated));
    setSelectedMarketingPresetId(newPreset.id);
  };

  const loadMarketingPreset = (id: string) => {
    const preset = marketingPresets.find(p => p.id === id);
    if (!preset) {
        setSelectedMarketingPresetId('');
        return;
    }

    Object.entries(preset.params).forEach(([key, value]) => {
      updateCurrentParam(key as any, value as number);
    });
    setSelectedMarketingPresetId(id);
  };

  const deleteMarketingPreset = () => {
    if (!selectedMarketingPresetId || !confirm('Tem certeza que deseja excluir este preset?')) return;
    const updated = marketingPresets.filter(p => p.id !== selectedMarketingPresetId);
    setMarketingPresets(updated);
    localStorage.setItem('tkx_marketing_presets', JSON.stringify(updated));
    setSelectedMarketingPresetId('');
  };

  // --- MOTOR DE CÁLCULO HÍBRIDO (Tabela Operacional + Parâmetros Financeiros) ---
  // Usa os volumes da tabela OPERATIONAL_GROWTH e aplica os custos/tarifas dos sliders
  const displayProjections = useMemo(() => {
    let accumulatedProfit = -currentParams.initialInvestment;

    // Fator de escala baseado no slider de Frota Inicial (Mês 1)
    // Base da tabela: 5 motoristas no Mês 1. Se o slider for 10, tudo dobra.
    const baseDriversM1 = 5;
    const sliderDrivers = currentParams.activeDrivers;
    const scaleFactor = baseDriversM1 > 0 ? sliderDrivers / baseDriversM1 : 1;

    return OPERATIONAL_GROWTH.map((op, idx) => {
      // 1. Volumes (Escalados pelo slider, mas com TETO de Mercado)
      // Teto de usuários (SOM): ~30.000 (15% do mercado + margem)
      const MAX_USERS_CAP = 30000;
      
      const drivers = Math.round(op.drivers * scaleFactor);
      let users = Math.round(op.users * scaleFactor);
      if (users > MAX_USERS_CAP) users = MAX_USERS_CAP;

      // Corridas baseadas nos usuários ativos e frequência (slider)
      const ridesPerUser = currentParams.ridesPerUserMonth || 4.2;
      const rides = Math.round(users * ridesPerUser);

      // 2. Receita (Baseada nos Sliders)
      const avgFare = currentParams.avgFare || 18.5; // Fallback de segurança
      const grossRevenue = Number((rides * avgFare).toFixed(2));
      const takeRateRevenue = grossRevenue * 0.15; // 15% Take Rate Fixo

      // 3. Custos Variáveis e Fixos (Baseados nos Sliders)
      const taxes = grossRevenue * 0.06; // 6% Impostos estimados
      const variableCosts = rides * 0.50; // Custo variável estimado por corrida (servidor/mapa)
      
      // Custos Fixos e Marketing
      const fixedCosts = currentParams.fixedCosts;
      const marketing = currentParams.marketingMonthly + currentParams.mktMensalOff + currentParams.trafegoPago;
      const tech = (grossRevenue * (currentParams.techFeePct || 0)) / 100;
      
      // Fidelidade e Campanhas
      const cashback = (currentParams.reservaOperacionalGMV / 100) * takeRateRevenue; // % do Take Rate
      const campaigns = currentParams.adesaoTurbo + currentParams.parceriasBares + currentParams.indiqueGanhe;
      
      // Custos Periódicos (Semestral/Anual)
      const isSemestral = (op.month % 6) === 0;
      const isAnual = (op.month % 12) === 0;
      const eliteDriversCost = isSemestral ? currentParams.eliteDriversSemestral : 0;
      const fidelidadePassageirosCost = isAnual ? currentParams.fidelidadePassageirosAnual : 0;

      const totalMarketing = marketing + campaigns;
      const totalTech = tech;

      // 4. Resultado
      const totalCosts = taxes + variableCosts + fixedCosts + totalMarketing + totalTech + cashback + eliteDriversCost + fidelidadePassageirosCost;
      const netProfit = takeRateRevenue - totalCosts;
      
      accumulatedProfit += netProfit;

      // KPIs e Capacidade
      const MPD = 10.1;
      const supplyCapacity = drivers * MPD * 30.5;
      const utilizacao = supplyCapacity > 0 ? (rides / supplyCapacity) * 100 : 0;
      
      // Cálculo de CAC e LTV
      const prevOp = idx > 0 ? OPERATIONAL_GROWTH[idx - 1] : null;
      const prevUsers = prevOp ? Math.round(prevOp.users * scaleFactor) : 0;
      const newUsers = Math.max(0, users - prevUsers);
      const cac = newUsers > 0 ? totalMarketing / newUsers : 0;
      
      // LTV Simplificado (Receita Líquida por Usuário / Churn estimado de 5%)
      const churnRate = 0.05; 
      const arpu = users > 0 ? (takeRateRevenue - variableCosts - taxes) / users : 0;
      const ltv = churnRate > 0 ? arpu / churnRate : 0;

      return {
        ...op, // month, phase, users, drivers
        drivers, // Override com valor escalado
        users,   // Override com valor escalado
        rides,
        grossRevenue,
        takeRateGross: takeRateRevenue, // Para compatibilidade com DRE
        takeRateRevenue,
        netProfit,
        accumulatedProfit,
        margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
        taxes,
        fixedCosts,
        marketing,
        totalMarketing,
        tech,
        totalTech,
        variableCosts,
        cashback,
        eliteDriversCost,
        fidelidadePassageirosCost,
        reservaOperacionalCost: cashback,
        cac,
        ltv,
        supplyCapacity,
        demandedRides: rides,
        utilizacao,
        isSupplyBottleneck: utilizacao > 90,
        demandGap: Math.max(0, rides - supplyCapacity)
      };
    });
  }, [currentParams]);

  const currentMonth = displayProjections[0];
  const lastMonth = displayProjections[displayProjections.length - 1];

  const summary = useMemo(() => {
    const gross = currentMonth?.grossRevenue ?? 0;
    const net = currentMonth?.netProfit ?? 0;
    const margin = currentMonth?.margin ?? 0;
    const drivers = currentMonth?.drivers ?? currentParams.activeDrivers;
    const users = currentMonth?.users ?? 0;
    return { gross, net, margin, drivers, users };
  }, [currentMonth]);

  const yearlyMetrics = useMemo(() => {
    const y1 = displayProjections.slice(0, 12);
    const y2 = displayProjections.slice(12, 24);
    const y3 = displayProjections.slice(24, 36);
    const calcYear = (months: MonthlyResult[]) => ({
      revenue: months.reduce((a, m) => a + m.grossRevenue, 0),
      profit: months.reduce((a, m) => a + m.netProfit, 0),
      rides: months.reduce((a, m) => a + m.rides, 0),
      finalUsers: months[months.length - 1]?.users ?? 0,
      finalDrivers: months[months.length - 1]?.drivers ?? 0,
    });
    return { y1: calcYear(y1), y2: calcYear(y2), y3: calcYear(y3) };
  }, [displayProjections]);

  // Função auxiliar para calcular métricas rápidas de um conjunto de parâmetros (para comparação)
  const calculateMetricsForParams = (params: any) => {
    let accumulatedProfit = -params.initialInvestment;
    const baseDriversM1 = 5;
    const sliderDrivers = params.activeDrivers;
    const scaleFactor = baseDriversM1 > 0 ? sliderDrivers / baseDriversM1 : 1;

    let totalProfit = 0;
    let totalRevenue = 0;
    let totalMarketingCost = 0;
    const semesters = Array.from({ length: 6 }, () => ({ profit: 0 }));
    let breakEvenSemester = -1;

    OPERATIONAL_GROWTH.forEach((op) => {
      const MAX_USERS_CAP = 30000;
      let users = Math.round(op.users * scaleFactor);
      if (users > MAX_USERS_CAP) users = MAX_USERS_CAP;

      const ridesPerUser = params.ridesPerUserMonth || 4.2;
      const rides = Math.round(users * ridesPerUser);

      const avgFare = params.avgFare || 18.5;
      const grossRevenue = Number((rides * avgFare).toFixed(2));
      const takeRateRevenue = grossRevenue * 0.15;

      const taxes = grossRevenue * 0.06;
      const variableCosts = rides * 0.50;
      const fixedCosts = params.fixedCosts;
      const marketing = params.marketingMonthly + params.mktMensalOff + params.trafegoPago;
      const tech = (grossRevenue * (params.techFeePct || 0)) / 100;
      const cashback = (params.reservaOperacionalGMV / 100) * takeRateRevenue;
      const campaigns = params.adesaoTurbo + params.parceriasBares + params.indiqueGanhe;

      const isSemestral = (op.month % 6) === 0;
      const isAnual = (op.month % 12) === 0;
      const eliteDriversCost = isSemestral ? params.eliteDriversSemestral : 0;
      const fidelidadePassageirosCost = isAnual ? params.fidelidadePassageirosAnual : 0;

      const totalMarketing = marketing + campaigns;
      const totalTech = tech;
      const totalCosts = taxes + variableCosts + fixedCosts + totalMarketing + totalTech + cashback + eliteDriversCost + fidelidadePassageirosCost;
      const netProfit = takeRateRevenue - totalCosts;

      accumulatedProfit += netProfit;
      if (breakEvenSemester === -1 && accumulatedProfit > 0) {
        breakEvenSemester = Math.ceil(op.month / 6);
      }

      totalProfit += netProfit;
      totalRevenue += grossRevenue;
      totalMarketingCost += totalMarketing;

      const semIdx = Math.ceil(op.month / 6) - 1;
      if (semesters[semIdx]) {
        semesters[semIdx].profit += netProfit;
      }
    });

    return { totalProfit, totalRevenue, totalMarketingCost, semesters, breakEvenSemester };
  };

  // Handlers para Snapshots
  const handleSaveSnapshot = (name: string, description: string) => {
    saveSnapshot(name, paramsMap, scenario, description);
    alert(`✅ Snapshot "${name}" salvo com sucesso!`);
  };

  const handleLoadSnapshot = (snap: any) => {
    Object.keys(snap.paramsMap).forEach((sc: any) => {
      const scenarioKey = sc as ScenarioType;
      const params = snap.paramsMap[scenarioKey];
      Object.keys(params).forEach((key: any) => {
        updateScenarioParam(scenarioKey, key as any, params[key]);
      });
    });
    setScenario(snap.activeScenario);
    alert(`✅ Snapshot "${snap.name}" carregado!`);
    setIsSnapshotModalOpen(false);
  };

  // Função para exportar em Excel
  const handleExportExcel = async () => {
    try {
      console.log('Iniciando exportação Excel...', { projectionsLength: displayProjections.length });
      const XLSX = await import('xlsx');
      
      const wb = XLSX.utils.book_new();
      
      // Aba 1: DRE Detalhado
      const dreData = displayProjections.map((r, idx) => ({
        'Mês': `M${r.month}`,
        'GMV': r.grossRevenue || 0,
        'Take 15%': (r.grossRevenue || 0) * 0.15,
        'Meritocracia': r.cashback || 0,
        'Receita': r.takeRateRevenue || 0,
        'Impostos': r.taxes || 0,
        'Fixos': r.fixedCosts || 0,
        'Marketing': r.totalMarketing || 0,
        'Tech': r.totalTech || 0,
        'Variáveis': r.variableCosts || 0,
        'Elite Drivers': r.eliteDriversCost || 0,
        'Fid. Passageiros': r.fidelidadePassageirosCost || 0,
        'Res. Oper.': r.reservaOperacional || 0,
        'Lucro/Prejuízo': r.netProfit || 0,
        'Margem %': r.margin || 0,
      }));
      console.log('DRE data prepared:', dreData.length, 'rows');
      
      const dreSheet = XLSX.utils.json_to_sheet(dreData);
      XLSX.utils.book_append_sheet(wb, dreSheet, 'DRE');
      
      // Aba 2: Drivers
      const driversData = displayProjections.map((r) => ({
        'Mês': `M${r.month}`,
        'Usuários': r.users || 0,
        'Frota': r.drivers || 0,
        'Corridas/dia': r.drivers > 0 ? (r.rides / r.drivers / 30.5).toFixed(2) : 0,
        'Corridas/mês (driver)': r.drivers > 0 ? Math.round(r.rides / r.drivers) : 0,
        'Driver/dia (Potencial)': r.drivers > 0 ? ((r.rides + (r.demandGap || 0)) / r.drivers / 30.5).toFixed(2) : 0,
        'Demanda': Math.round(r.demandedRides || 0),
        'Capacidade': Math.round(r.supplyCapacity || 0),
        'Realizado': Math.round(r.rides || 0),
        'Gap Corridas': r.demandGap > 0 ? Math.round(r.demandGap) : 0,
        'Utilização %': (r.utilizacao || 0).toFixed(1),
      }));
      console.log('Drivers data prepared:', driversData.length, 'rows');
      
      const driversSheet = XLSX.utils.json_to_sheet(driversData);
      XLSX.utils.book_append_sheet(wb, driversSheet, 'Drivers');
      
      // Aba 3: Resumo Anual
      const summaryData = [
        {
          'Período': 'Ano 1 (M1-12)',
          'Receita': Math.round(yearlyMetrics.y1.revenue),
          'Lucro': Math.round(yearlyMetrics.y1.profit),
          'Corridas': Math.round(yearlyMetrics.y1.rides),
          'Usuários Final': Math.round(yearlyMetrics.y1.finalUsers),
          'Frota Final': Math.round(yearlyMetrics.y1.finalDrivers),
        },
        {
          'Período': 'Ano 2 (M13-24)',
          'Receita': Math.round(yearlyMetrics.y2.revenue),
          'Lucro': Math.round(yearlyMetrics.y2.profit),
          'Corridas': Math.round(yearlyMetrics.y2.rides),
          'Usuários Final': Math.round(yearlyMetrics.y2.finalUsers),
          'Frota Final': Math.round(yearlyMetrics.y2.finalDrivers),
        },
        {
          'Período': 'Ano 3 (M25-36)',
          'Receita': Math.round(yearlyMetrics.y3.revenue),
          'Lucro': Math.round(yearlyMetrics.y3.profit),
          'Corridas': Math.round(yearlyMetrics.y3.rides),
          'Usuários Final': Math.round(yearlyMetrics.y3.finalUsers),
          'Frota Final': Math.round(yearlyMetrics.y3.finalDrivers),
        },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo Anual');
      
      // Aba 4: Parâmetros
      const paramsData = Object.entries(currentParams).map(([key, value]) => ({
        'Parâmetro': key,
        'Valor': value,
      }));
      const paramsSheet = XLSX.utils.json_to_sheet(paramsData);
      XLSX.utils.book_append_sheet(wb, paramsSheet, 'Parâmetros');

      // Aba 5: Festas/Eventos (se válido)
      try {
        const validDates = eventStartStr && eventEndStr && new Date(eventEndStr) >= new Date(eventStartStr);
        const msPerDay = 1000 * 60 * 60 * 24;
        const days = validDates ? (Math.floor((new Date(eventEndStr).getTime() - new Date(eventStartStr).getTime()) / msPerDay) + 1) : 0;
        const baseMonthlyRides = displayProjections[0].rides || 0;
        const baseDailyRides = baseMonthlyRides / 30;
        const baseEventRides = Math.max(0, Math.round(baseDailyRides * days));
        const totalEventRides = Math.max(0, Math.round(baseEventRides * (1 + (ridesExtraPct || 0) / 100)));
        const avgFareBase = currentParams.avgFare || 0;
        const avgFareAdj = avgFareBase * (1 + (dynamicPct || 0) / 100);
        const gmvEvent = totalEventRides * avgFareAdj;
        const takeRate = (currentParams as any).takeRate ?? 0.15;
        const plataformaReceita = gmvEvent * takeRate;
        const MPD = 10.1;
        const driversCapacity = Math.floor((driversNeeded || 0) * MPD * Math.max(1, days));
        const coberturaPct = totalEventRides > 0 ? Math.min(100, (driversCapacity / totalEventRides) * 100) : 0;
        const corridasDiaNecessarias = days > 0 ? Math.ceil(totalEventRides / days) : 0;
        const corridasPorDriverDia = (driversNeeded || 0) > 0 && days > 0 ? (totalEventRides / days) / driversNeeded : 0;
        const dailyCapacity = (driversNeeded || 0) * MPD;
        const perDayRidesConst = corridasDiaNecessarias;
        const sCurveWeights = (n: number) => {
          if (n <= 0) return [] as number[];
          const mid = (n - 1) * peakPosition;
          const k = curveIntensity;
          const raw = Array.from({ length: n }, (_, i) => {
            const s = 1 / (1 + Math.exp(-k * (i - mid)));
            return s * (1 - s);
          });
          const sum = raw.reduce((a, b) => a + b, 0) || 1;
          return raw.map(v => v / sum);
        };
        const weights = distributionMode === 'curvaS' ? sCurveWeights(days) : [];
        const eventDailyData = Array.from({ length: days }, (_, i) => ({
          Dia: i + 1,
          'Corridas/dia': distributionMode === 'curvaS' ? Math.round(totalEventRides * (weights[i] || 0)) : perDayRidesConst,
          'Capacidade/dia': dailyCapacity
        }));
        const peakIdx = eventDailyData.reduce((maxI, d, i) => (d['Corridas/dia'] > (eventDailyData[maxI]?.['Corridas/dia'] || 0) ? i : maxI), 0);
        const peakDay = eventDailyData[peakIdx]?.Dia || 1;

        const eventosResumo = [{
          'Início': eventStartStr || '—',
          'Fim': eventEndStr || '—',
          'Dias': days,
          'Corridas estimadas': totalEventRides,
          'Tarifa média dinâmica': avgFareAdj,
          'GMV evento': gmvEvent,
          'Receita plataforma': plataformaReceita,
          'Corridas/dia necessárias': corridasDiaNecessarias,
          'Corridas por driver/dia': Math.ceil(corridasPorDriverDia),
          'Capacidade total (corridas)': driversCapacity,
          'Cobertura (%)': coberturaPct,
          'Drivers informados': driversNeeded || 0,
          'Distribuição': distributionMode,
          'Intensidade (k)': curveIntensity,
          'Pico (Dia)': peakDay,
        }];

        const eventosResumoSheet = XLSX.utils.json_to_sheet(eventosResumo);
        XLSX.utils.book_append_sheet(wb, eventosResumoSheet, 'Eventos');

        if (validDates && days > 0) {
          const eventosDiarioSheet = XLSX.utils.json_to_sheet(eventDailyData);
          XLSX.utils.book_append_sheet(wb, eventosDiarioSheet, 'Eventos_Diário');
        }
      } catch (e) {
        console.warn('Falha ao gerar abas de Eventos:', e);
      }
      
      // Salvar arquivo
      const fileName = `TKX-Dashboard-${scenario}-${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Saving file:', fileName);
      XLSX.writeFile(wb, fileName);
      console.log('✅ Arquivo exportado com sucesso!');
      alert(`✅ Arquivo "${fileName}" exportado com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      alert(`❌ Erro ao exportar: ${error}`);
    }
  };

  // Função para imprimir/PDF
  const handleExportPDF = () => {
    window.print();
  };

  const renderScenarioSelector = () => (
    <div className="flex flex-wrap gap-2">
      {Object.values(ScenarioType).map((sc) => (
        <button
          key={sc}
          type="button"
          onClick={() => setScenario(sc)}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase border-2 transition-all duration-300 ${
            scenario === sc 
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-950 border-yellow-400 shadow-lg shadow-yellow-500/50 scale-105' 
              : 'border-slate-600 text-slate-200 hover:border-yellow-500/50 hover:text-yellow-400 hover:shadow-md'
          }`}
        >
          {SCENARIO_LABEL[sc]}
        </button>
      ))}
      <button
        type="button"
        onClick={resetParams}
        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-slate-600 text-slate-200 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
        title="Reseta todos os parâmetros do cenário atual para os valores padrão"
      >
        Resetar
      </button>
    </div>
  );

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[{
        label: 'Receita Bruta (Mês 1)',
        value: summary.gross,
        accent: 'text-gradient-gold',
        bg: 'from-yellow-500/10 to-orange-500/5',
        icon: <DollarSign className="w-5 h-5 text-yellow-500" />
      }, {
        label: profitLabel(summary.net, 'Lucro Líquido (Mês 1)', 'Prejuízo (Mês 1)'),
        value: summary.net,
        isProfit: true,
        accent: profitColor(summary.net, 'text-gradient-green', 'text-gradient-red'),
        bg: summary.net >= 0 ? 'from-green-500/10 to-emerald-500/5' : 'from-red-500/10 to-rose-500/5',
        icon: <TrendingUp className={`w-5 h-5 ${summary.net >= 0 ? 'text-green-500' : 'text-red-500'}`} />
      }, {
        label: 'Margem (Mês 1)',
        value: summary.margin,
        isPercent: true,
        accent: summary.margin >= 0 ? 'text-gradient-green' : 'text-gradient-red',
        bg: summary.margin >= 0 ? 'from-green-500/10 to-emerald-500/5' : 'from-red-500/10 to-rose-500/5',
        icon: <Activity className="w-5 h-5 text-blue-500" />
      }, {
        label: 'Frota / Usuários',
        value: [summary.drivers, summary.users],
        isArray: true,
        accent: 'text-white',
        bg: 'from-blue-500/10 to-indigo-500/5',
        icon: <Users className="w-5 h-5 text-indigo-500" />
      }].map((card) => (
        <div key={card.label} className={`relative overflow-hidden bg-gradient-to-br ${card.bg} border border-slate-700/50 p-5 rounded-xl shadow-lg group hover:border-slate-600 transition-all`}>
          <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">{card.icon}</div>
          <div className="text-[8px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-2">{card.label}</div>
          <div className={`text-2xl font-black ${card.accent}`}>
            {card.isPercent ? <PercentDisplay value={card.value as number} /> : card.isArray ? (
              <>
                <NumberDisplay value={(card.value as number[])[0]} />
                <span className="text-slate-400 text-lg"> / </span>
                <NumberDisplay value={(card.value as number[])[1]} />
              </>
            ) : card.isProfit ? (
              <CurrencyDisplay value={profitValue(card.value as number)} colorClass={profitColor(card.value as number)} />
            ) : <CurrencyDisplay value={card.value as number} />}
          </div>
        </div>
      ))}
    </div>
  );

  const renderParams = () => (
    <div className="space-y-6">
      {/* Barra de Presets de Parametrização */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <FolderOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 sm:flex-none">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Carregar Preset</label>
                  <select
                      value={selectedParamPresetId}
                      onChange={(e) => loadParamPreset(e.target.value)}
                      className="w-full sm:w-64 bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                  >
                      <option value="">Selecione um preset...</option>
                      {paramPresets.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
              </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
              <button
                  onClick={saveParamPreset}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                  <Save className="w-4 h-4" /> Salvar Atual
              </button>
              {selectedParamPresetId && (
                  <button
                      onClick={deleteParamPreset}
                      className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 rounded-lg transition-colors"
                      title="Excluir preset selecionado"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              )}
          </div>
      </div>

      {/* Comparador de Estratégias (Parametrização) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-black uppercase text-slate-400">Comparador de Estratégias (36 Meses)</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Lado A */}
              <div className="space-y-3">
                  <select 
                      value={compareParamPresetId1} 
                      onChange={(e) => setCompareParamPresetId1(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500"
                  >
                      <option value="">Atual (Editando)</option>
                      {paramPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {(() => {
                      const params1 = compareParamPresetId1 
                          ? { ...currentParams, ...paramPresets.find(p => p.id === compareParamPresetId1)?.params } 
                          : currentParams;
                      const metrics1 = calculateMetricsForParams(params1);
                      return (
                          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                              <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Lucro Total</span>
                                  <span className={`font-bold ${metrics1.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatCurrency(metrics1.totalProfit)}
                                  </span>
                              </div>
                              <div className="pt-2 mt-2 border-t border-slate-700/50">
                                  <div className="flex items-center justify-between mb-1">
                                      <span className="text-[9px] uppercase text-slate-500 font-bold">Resultado Semestral</span>
                                      {metrics1.breakEvenSemester !== -1 && (
                                          <div className="flex items-center gap-1 text-[8px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/20 cursor-help" title="Momento em que o lucro acumulado se torna positivo (Payback)">
                                              <span>★</span> Payback
                                          </div>
                                      )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                      {metrics1.semesters.map((s, i) => (
                                          <div key={i} className={`flex justify-between text-[9px] items-center ${metrics1.breakEvenSemester === i + 1 ? 'bg-green-900/30 -mx-1 px-1 rounded border border-green-500/30' : ''}`}>
                                              <span className={`flex items-center gap-1 ${metrics1.breakEvenSemester === i + 1 ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                                                  S{i+1}
                                                  {metrics1.breakEvenSemester === i + 1 && <span title="Break-even (Payback)">★</span>}
                                              </span>
                                              <span className={`font-mono ${s.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(s.profit)}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      );
                  })()}
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">VS</div>
              </div>

              {/* Lado B */}
              <div className="space-y-3">
                  <select 
                      value={compareParamPresetId2} 
                      onChange={(e) => setCompareParamPresetId2(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500"
                  >
                      <option value="">Selecione para comparar...</option>
                      {paramPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {compareParamPresetId2 ? (() => {
                      const params2 = { ...currentParams, ...paramPresets.find(p => p.id === compareParamPresetId2)?.params };
                      const metrics2 = calculateMetricsForParams(params2);
                      
                      const params1 = compareParamPresetId1 
                          ? { ...currentParams, ...paramPresets.find(p => p.id === compareParamPresetId1)?.params } 
                          : currentParams;
                      const metrics1 = calculateMetricsForParams(params1);
                      
                      const profitDiff = metrics2.totalProfit - metrics1.totalProfit;
                      
                      return (
                          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                              <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Lucro Total</span>
                                  <div className="text-right">
                                      <div className={`font-bold ${metrics2.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {formatCurrency(metrics2.totalProfit)}
                                      </div>
                                      <div className={`text-[9px] ${profitDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                          {profitDiff >= 0 ? '+' : ''}{formatCurrency(profitDiff)}
                                      </div>
                                  </div>
                              </div>
                              <div className="pt-2 mt-2 border-t border-slate-700/50">
                                  <div className="flex items-center justify-between mb-1">
                                      <span className="text-[9px] uppercase text-slate-500 font-bold">Resultado Semestral</span>
                                      {metrics2.breakEvenSemester !== -1 && (
                                          <div className="flex items-center gap-1 text-[8px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/20 cursor-help" title="Momento em que o lucro acumulado se torna positivo (Payback)">
                                              <span>★</span> Payback
                                          </div>
                                      )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                      {metrics2.semesters.map((s, i) => (
                                          <div key={i} className={`flex justify-between text-[9px] items-center ${metrics2.breakEvenSemester === i + 1 ? 'bg-green-900/30 -mx-1 px-1 rounded border border-green-500/30' : ''}`}>
                                              <span className={`flex items-center gap-1 ${metrics2.breakEvenSemester === i + 1 ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                                                  S{i+1}
                                                  {metrics2.breakEvenSemester === i + 1 && <span title="Break-even (Payback)">★</span>}
                                              </span>
                                              <span className={`font-mono ${s.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(s.profit)}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      );
                  })() : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-600 italic border border-dashed border-slate-800 rounded-lg p-4">
                          Selecione um preset
                      </div>
                  )}
              </div>
          </div>
      </div>

      <h3 className="text-sm font-black uppercase text-yellow-500">Parâmetros principais</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PARAM_SLIDERS.map((p) => (
          <div key={p.key} className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase font-black text-slate-400">
              <span>{p.label}</span>
              <span className="text-yellow-400 text-sm">{(currentParams as any)[p.paramKey]}{p.unit ?? ''}</span>
            </div>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={(currentParams as any)[p.paramKey]}
              onChange={(e) => updateCurrentParam(p.paramKey as any, Number(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderBench = () => {
    const players = FRANCA_STATS.marketPlayers.map((p: any) => ({
      ...p,
      color: PLAYER_COLORS[p.name] || '#e2e8f0',
    }));
    const shareOverrides: Record<string, number> = {
      Uber: 50,
      '99': 20,
      Maxim: 18,
      Garupa: 5,
      'Urban 66': 5,
      'TKX Franca': 2,
    };
    const ratingData = players.map((p: any) => ({
      name: p.name,
      share: shareOverrides[p.name] ?? p.share,
      ticket: p.ticket,
      satisfaction: p.satisfaction ?? (p.name === 'TKX Franca' ? 4.6 : 4.2),
      color: p.color,
    }));
    // Gradientes por player (Bench)
    const GRADIENT_IDS: Record<string, string> = {
      Uber: 'gradUber',
      '99': 'grad99',
      Maxim: 'gradMaxim',
      Garupa: 'gradGarupa',
      'Urban 66': 'gradUrban',
      'TKX Franca': 'gradTKX',
    };
    const legendChips = (
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
        {ratingData.map((p) => (
          <div key={p.name} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="font-semibold">{p.name}</span>
          </div>
        ))}
      </div>
    );

    return (
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase text-yellow-500">Benchmark / Market Share</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black mb-2">Participação de Mercado</div>
              <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ratingData}>
                <defs>
                  <linearGradient id="gradUber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b1220" />
                    <stop offset="100%" stopColor="#1f2937" />
                  </linearGradient>
                  <linearGradient id="grad99" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <linearGradient id="gradMaxim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="gradGarupa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e5e7eb" />
                    <stop offset="100%" stopColor="#f3f4f6" />
                  </linearGradient>
                  <linearGradient id="gradUrban" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="gradTKX" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
                <Bar dataKey="share" radius={[8, 8, 4, 4]}>
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-share-${index}`} fill={`url(#${GRADIENT_IDS[entry.name] || 'grad99'})`} stroke="#0b1220" strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2">{legendChips}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black mb-2">Ticket Médio (R$)</div>
              <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ratingData}>
                <defs>
                  <linearGradient id="gradTicketUber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b1220" />
                    <stop offset="100%" stopColor="#1f2937" />
                  </linearGradient>
                  <linearGradient id="gradTicket99" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <linearGradient id="gradTicketMaxim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="gradTicketGarupa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e5e7eb" />
                    <stop offset="100%" stopColor="#f3f4f6" />
                  </linearGradient>
                  <linearGradient id="gradTicketUrban" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="gradTicketTKX" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
                <Bar dataKey="ticket" radius={[8, 8, 4, 4]}>
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-ticket-${index}`} fill={`url(#${
                      entry.name === 'Uber' ? 'gradTicketUber' :
                      entry.name === '99' ? 'gradTicket99' :
                      entry.name === 'Maxim' ? 'gradTicketMaxim' :
                      entry.name === 'Garupa' ? 'gradTicketGarupa' :
                      entry.name === 'Urban 66' ? 'gradTicketUrban' :
                      'gradTicketTKX'
                    })`} stroke="#0b1220" strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2">{legendChips}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black">Satisfação x Market Share x Ticket</div>
              <div className="text-xs text-slate-500">Notas (1-5), participação (%) e ticket médio por player</div>
            </div>
            {legendChips}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={ratingData}>
              <defs>
                <linearGradient id="gradShareUber2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b1220" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>
                <linearGradient id="gradShare992" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="gradShareMaxim2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="gradShareGarupa2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e5e7eb" />
                  <stop offset="100%" stopColor="#f3f4f6" />
                </linearGradient>
                <linearGradient id="gradShareUrban2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="gradShareTKX2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#475569" fontSize={11} />
              <YAxis yAxisId="left" stroke="#22c55e" domain={[0, 5]} tickFormatter={(v) => v.toFixed(0)} width={40} />
              <YAxis yAxisId="right" orientation="right" stroke="#eab308" domain={[0, 60]} tickFormatter={(v) => `${v}%`} width={45} />
              <YAxis yAxisId="ticket" orientation="right" stroke="#38bdf8" domain={[0, 30]} tickFormatter={(v) => `R$${v}`} width={55} hide />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
              <Legend content={<NeutralLegend />} />
              <Bar yAxisId="right" dataKey="share" name="Market share" radius={[8, 8, 4, 4]}>
                {ratingData.map((entry, index) => (
                  <Cell key={`cell-share2-${index}`} fill={`url(#${
                    entry.name === 'Uber' ? 'gradShareUber2' :
                    entry.name === '99' ? 'gradShare992' :
                    entry.name === 'Maxim' ? 'gradShareMaxim2' :
                    entry.name === 'Garupa' ? 'gradShareGarupa2' :
                    entry.name === 'Urban 66' ? 'gradShareUrban2' :
                    'gradShareTKX2'
                  })`} stroke="#0b1220" strokeWidth={2} />
                ))}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="satisfaction" name="Satisfação" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#eab308', stroke: '#0b1220', strokeWidth: 1 }} />
              <Line yAxisId="ticket" type="monotone" dataKey="ticket" name="Ticket médio" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b', stroke: '#0b1220', strokeWidth: 1 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderMarketing = () => {
    const data = [
      { name: 'Marketing', value: currentParams.marketingMonthly || 0 },
      { name: 'Tech', value: (displayProjections[0].grossRevenue * (currentParams.techFeePct || 0)) / 100 },
      { name: 'Adesão Turbo', value: currentParams.adesaoTurbo || 0 },
      { name: 'Tráfego Pago', value: currentParams.trafegoPago || 0 },
      { name: 'Parcerias', value: currentParams.parceriasBares || 0 },
      { name: 'Indique/Ganhe', value: currentParams.indiqueGanhe || 0 },
    ];
    const colors = ['#0b1220', '#f59e0b', '#eab308', '#e5e7eb', '#ef4444', '#fbbf24'];
    return (
      <div className="space-y-6">
        {/* Barra de Presets de Marketing */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                    <FolderOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 sm:flex-none">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Carregar Preset</label>
                    <select
                        value={selectedMarketingPresetId}
                        onChange={(e) => loadMarketingPreset(e.target.value)}
                        className="w-full sm:w-64 bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-pink-500"
                    >
                        <option value="">Selecione um preset...</option>
                        {marketingPresets.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button
                    onClick={saveMarketingPreset}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                    <Save className="w-4 h-4" /> Salvar Atual
                </button>
                {selectedMarketingPresetId && (
                    <button
                        onClick={deleteMarketingPreset}
                        className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 rounded-lg transition-colors"
                        title="Excluir preset selecionado"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>

        {/* Comparador de Estratégias */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-black uppercase text-slate-400">Comparador de Estratégias (36 Meses)</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Lado A */}
                <div className="space-y-3">
                    <select 
                        value={comparePresetId1} 
                        onChange={(e) => setComparePresetId1(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-purple-500"
                    >
                        <option value="">Atual (Editando)</option>
                        {marketingPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {(() => {
                        const params1 = comparePresetId1 
                            ? { ...currentParams, ...marketingPresets.find(p => p.id === comparePresetId1)?.params } 
                            : currentParams;
                        const metrics1 = calculateMetricsForParams(params1);
                        return (
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Lucro Total</span>
                                    <span className={`font-bold ${metrics1.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(metrics1.totalProfit)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Invest. MKT</span>
                                    <span className="text-slate-200">{formatCurrency(metrics1.totalMarketingCost)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">ROI (MKT)</span>
                                    <span className="text-purple-400 font-bold">
                                        {metrics1.totalMarketingCost > 0 ? ((metrics1.totalProfit / metrics1.totalMarketingCost) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-700/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] uppercase text-slate-500 font-bold">Resultado Semestral</span>
                                        {metrics1.breakEvenSemester !== -1 && (
                                            <div className="flex items-center gap-1 text-[8px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/20 cursor-help" title="Momento em que o lucro acumulado se torna positivo (Payback)">
                                                <span>★</span> Payback
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                        {metrics1.semesters.map((s, i) => (
                                            <div key={i} className={`flex justify-between text-[9px] items-center ${metrics1.breakEvenSemester === i + 1 ? 'bg-green-900/30 -mx-1 px-1 rounded border border-green-500/30' : ''}`}>
                                                <span className={`flex items-center gap-1 ${metrics1.breakEvenSemester === i + 1 ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                                                    S{i+1}
                                                    {metrics1.breakEvenSemester === i + 1 && <span title="Break-even (Payback)">★</span>}
                                                </span>
                                                <span className={`font-mono ${s.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(s.profit)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* VS */}
                <div className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">VS</div>
                </div>

                {/* Lado B */}
                <div className="space-y-3">
                    <select 
                        value={comparePresetId2} 
                        onChange={(e) => setComparePresetId2(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-purple-500"
                    >
                        <option value="">Selecione para comparar...</option>
                        {marketingPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {comparePresetId2 ? (() => {
                        const params2 = { ...currentParams, ...marketingPresets.find(p => p.id === comparePresetId2)?.params };
                        const metrics2 = calculateMetricsForParams(params2);
                        
                        // Calculate diffs against Preset 1 (or Current)
                        const params1 = comparePresetId1 
                            ? { ...currentParams, ...marketingPresets.find(p => p.id === comparePresetId1)?.params } 
                            : currentParams;
                        const metrics1 = calculateMetricsForParams(params1);
                        
                        const profitDiff = metrics2.totalProfit - metrics1.totalProfit;
                        
                        return (
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Lucro Total</span>
                                    <div className="text-right">
                                        <div className={`font-bold ${metrics2.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(metrics2.totalProfit)}
                                        </div>
                                        <div className={`text-[9px] ${profitDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {profitDiff >= 0 ? '+' : ''}{formatCurrency(profitDiff)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Invest. MKT</span>
                                    <span className="text-slate-200">{formatCurrency(metrics2.totalMarketingCost)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">ROI (MKT)</span>
                                    <span className="text-purple-400 font-bold">
                                        {metrics2.totalMarketingCost > 0 ? ((metrics2.totalProfit / metrics2.totalMarketingCost) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-700/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] uppercase text-slate-500 font-bold">Resultado Semestral</span>
                                        {metrics2.breakEvenSemester !== -1 && (
                                            <div className="flex items-center gap-1 text-[8px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/20 cursor-help" title="Momento em que o lucro acumulado se torna positivo (Payback)">
                                                <span>★</span> Payback
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                        {metrics2.semesters.map((s, i) => (
                                            <div key={i} className={`flex justify-between text-[9px] items-center ${metrics2.breakEvenSemester === i + 1 ? 'bg-green-900/30 -mx-1 px-1 rounded border border-green-500/30' : ''}`}>
                                                <span className={`flex items-center gap-1 ${metrics2.breakEvenSemester === i + 1 ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                                                    S{i+1}
                                                    {metrics2.breakEvenSemester === i + 1 && <span title="Break-even (Payback)">★</span>}
                                                </span>
                                                <span className={`font-mono ${s.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(s.profit)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-600 italic border border-dashed border-slate-800 rounded-lg p-4">
                            Selecione um preset
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase text-yellow-500">Sliders de Marketing</h3>
          {/* Controle de Campanhas */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-black">Campanhas (Adesão, Parcerias, Indique/Ganhe)</div>
                <div className="text-xs text-slate-500">Suspender campanhas não afeta Mídia OFF nem Tráfego Pago.</div>
              </div>
              {campaignsSuspended ? (
                <button
                  type="button"
                  onClick={restoreCampaigns}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                >
                  Reativar Campanhas
                </button>
              ) : (
                <button
                  type="button"
                  onClick={suspendCampaigns}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
                >
                  Suspender Campanhas
                </button>
              )}
            </div>
            {campaignsSuspended && (
              <div className="mt-3 bg-red-900/40 border border-red-700/60 p-3 rounded text-red-200 text-xs">
                ⚠️ Campanhas suspensas neste cenário. Sliders desabilitados: <strong>Adesão Turbo</strong>, <strong>Parcerias</strong>, <strong>Indique/Ganhe</strong>,
                <strong> Elite Drivers</strong>, <strong> Fidelidade Passageiros</strong> e <strong> Reserva Operacional</strong>. 
                Mantidos ativos: <strong>Mídia OFF</strong> e <strong>Tráfego Pago</strong>.
              </div>
            )}
          </div>
          {(() => {
            const primaryKeys = new Set<string>(['fixedCosts','marketingMonthly', 'techFeePct']);
            const primary = (MKT_SLIDERS || []).filter(s => primaryKeys.has(String(s.paramKey)));
            const rest = (MKT_SLIDERS || []).filter(s => !primaryKeys.has(String(s.paramKey)));
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {primary.map((s) => (
                    <div key={s.paramKey} className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase font-black text-slate-400">
                        <span>{s.label}</span>
                        <span className="text-yellow-400 text-sm">
                          {s.paramKey === 'techFeePct' ? `${((currentParams as any)[s.paramKey] || 0).toFixed(1)}%` : formatCurrency((currentParams as any)[s.paramKey])}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={(currentParams as any)[s.paramKey]}
                        onChange={(e) => updateCurrentParam(s.paramKey as any, Number(e.target.value))}
                        className="w-full accent-yellow-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rest.map((s) => (
                    <div key={s.paramKey} className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase font-black text-slate-400">
                        <span>{s.label}</span>
                        <span className="text-yellow-400 text-sm">{formatCurrency((currentParams as any)[s.paramKey])}</span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={(currentParams as any)[s.paramKey]}
                        onChange={(e) => updateCurrentParam(s.paramKey as any, Number(e.target.value))}
                        className={`w-full accent-yellow-500 ${campaignsSuspended && (s.paramKey === 'adesaoTurbo' || s.paramKey === 'parceriasBares' || s.paramKey === 'indiqueGanhe') ? 'opacity-40 cursor-not-allowed' : ''}`}
                        disabled={campaignsSuspended && (s.paramKey === 'adesaoTurbo' || s.paramKey === 'parceriasBares' || s.paramKey === 'indiqueGanhe')}
                      />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
          
        </div>
        
        {/* Card de Custos Mínimos removido conforme solicitação */}
        
        {/* TKX DYNAMIC CONTROL: Sliders de Fidelidade */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black uppercase text-orange-500">🎯 TKX Dynamic Control - Fidelidade</h3>
              <span className="text-[10px] text-slate-400 px-2 py-1 rounded-full bg-slate-800 border border-slate-700">Elite Drivers + Passageiros + Reserva Operacional</span>
            </div>
            <button
              type="button"
              onClick={() => updateCurrentParam('reservaOperacionalGMV', 0)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-orange-600 text-orange-300 hover:border-orange-400 hover:bg-orange-500/10 transition-all duration-300"
              title="Zera apenas a Reserva Operacional (Cashback)"
            >
              Zerar Cashback
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FIDELITY_SLIDERS && FIDELITY_SLIDERS.map((s) => (
              <div key={s.paramKey} className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-black text-slate-400">
                  <span>{s.label}</span>
                  <span className="text-orange-400 text-sm">
                    {s.paramKey === 'reservaOperacionalGMV' ? `${((currentParams as any)[s.paramKey] || 0).toFixed(1)}%` : formatCurrency((currentParams as any)[s.paramKey] || 0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(currentParams as any)[s.paramKey]}
                  onChange={(e) => updateCurrentParam(s.paramKey as any, Number(e.target.value))}
                  className={`w-full accent-orange-500 ${campaignsSuspended ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={campaignsSuspended}
                />
                <div className="text-[9px] text-slate-500">{s.description}</div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/30 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-orange-400 font-black mb-2">💡 Consolidação de Campanhas</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <span className="font-bold text-orange-300">Motoristas:</span> Meritocracia por faixas - 🥉 Ouro 450+ (10%), 🥈 Prata 300-449 (12%), 🥉 Bronze 0-299 (15%). Premiação semestral para 20 melhores.
              </div>
              <div>
                <span className="font-bold text-orange-300">Passageiros:</span> Gatilhos de 500, 1.000 e 2.000 corridas (Cashback, Select e Experiência/Sorteio).
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Composição da Receita (Take Rate) */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h4 className="text-[10px] uppercase text-slate-400 font-black mb-4">Composição da Receita da Plataforma (Mês 1)</h4>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={(() => {
                  const m1 = displayProjections[0];
                  return [
                    { name: 'Tecnologia', value: m1.totalTech || 0, fill: '#8b5cf6' },
                    { name: 'Marketing', value: m1.totalMarketing || 0, fill: '#ec4899' },
                    { name: 'Custos Fixos', value: m1.fixedCosts || 0, fill: '#6366f1' },
                    { name: 'Impostos', value: m1.taxes || 0, fill: '#f43f5e' },
                    { name: 'Outros Custos', value: (m1.variableCosts || 0) + (m1.cashback || 0) + (m1.eliteDriversCost || 0) + (m1.fidelidadePassageirosCost || 0), fill: '#d97706' },
                    { name: 'Lucro Líquido', value: Math.max(0, m1.netProfit || 0), fill: '#22c55e' },
                  ].filter(item => item.value > 0);
                })()} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={3}>
                  {data.map((_, i) => <Cell key={`cell-comp-${i}`} fill={colors[i % colors.length]} stroke="#0b1220" strokeWidth={1.2} />)}
                </Pie>
                <Tooltip content={<DarkTooltip formatter={(value) => formatCurrency(value as number)} />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
                <Legend content={<NeutralLegend />} verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black mb-4">Distribuição de Verba</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={3}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} stroke="#0b1220" strokeWidth={1.2} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
                <Legend content={<NeutralLegend />} verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderFestasEventos = () => {
    const validDates = eventStartStr && eventEndStr && new Date(eventEndStr) >= new Date(eventStartStr);
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = validDates ? (Math.floor((new Date(eventEndStr).getTime() - new Date(eventStartStr).getTime()) / msPerDay) + 1) : 0;
    const baseMonthlyRides = displayProjections[0].rides || 0;
    const baseDailyRides = baseMonthlyRides / 30;
    const baseEventRides = Math.max(0, Math.round(baseDailyRides * days));
    const totalEventRides = Math.max(0, Math.round(baseEventRides * (1 + (ridesExtraPct || 0) / 100)));
    const avgFareBase = currentParams.avgFare || 0;
    const avgFareAdj = avgFareBase * (1 + (dynamicPct || 0) / 100);
    const gmvEvent = totalEventRides * avgFareAdj;
    const takeRate = (currentParams as any).takeRate ?? 0.15;
    const plataformaReceita = gmvEvent * takeRate;
    const extraProfitPerRidePct = avgFareBase > 0 ? ((avgFareAdj - avgFareBase) / avgFareBase) * 100 : 0;
    const MPD = 10.1;
    const driversCapacity = Math.floor((driversNeeded || 0) * MPD * Math.max(1, days));
    const coberturaPct = totalEventRides > 0 ? Math.min(100, (driversCapacity / totalEventRides) * 100) : 0;
    const driversSugeridos = days > 0 ? Math.ceil((totalEventRides / (MPD * days)) || 0) : 0;
    const corridasDiaNecessarias = days > 0 ? Math.ceil(totalEventRides / days) : 0;
    const corridasPorDriverDia = (driversNeeded || 0) > 0 && days > 0 ? (totalEventRides / days) / driversNeeded : 0;
    const dailyCapacity = (driversNeeded || 0) * MPD;
    const perDayRidesConst = corridasDiaNecessarias;
    const sCurveWeights = (n: number) => {
      if (n <= 0) return [] as number[];
      const mid = (n - 1) * peakPosition; // controla onde ocorre o pico
      const k = curveIntensity; // controla quão acentuado é o pico
      const raw = Array.from({ length: n }, (_, i) => {
        const s = 1 / (1 + Math.exp(-k * (i - mid)));
        return s * (1 - s); // derivada logística (s-curve bell)
      });
      const sum = raw.reduce((a, b) => a + b, 0) || 1;
      return raw.map(v => v / sum);
    };
    const weights = distributionMode === 'curvaS' ? sCurveWeights(days) : [];
    const eventDailyData = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      rides: distributionMode === 'curvaS' ? Math.round(totalEventRides * (weights[i] || 0)) : perDayRidesConst,
      capacity: dailyCapacity,
    }));
    const peakIdx = eventDailyData.reduce((maxI, d, i) => (d.rides > (eventDailyData[maxI]?.rides || 0) ? i : maxI), 0);
    const peakDay = eventDailyData[peakIdx]?.day || 1;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase text-yellow-500">Projeções de Festas/Eventos</h3>
          <span className="text-[10px] text-slate-400 px-2 py-1 rounded-full bg-slate-800 border border-slate-700">Selecione período e parâmetros</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Início do evento</div>
              <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
                value={eventStartStr} onChange={(e) => setEventStartStr(e.target.value)} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Fim do evento</div>
              <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
                value={eventEndStr} onChange={(e) => setEventEndStr(e.target.value)} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Dinâmica sobre tarifa (%)</div>
              <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" placeholder="ex.: 25"
                value={dynamicPct} onChange={(e) => setDynamicPct(Number(e.target.value))} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">% adicional de corridas</div>
              <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" placeholder="ex.: 40"
                value={ridesExtraPct} onChange={(e) => setRidesExtraPct(Number(e.target.value))} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Drivers necessários</div>
              <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" placeholder="ex.: 120"
                value={driversNeeded} onChange={(e) => setDriversNeeded(Number(e.target.value))} />
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Distribuição diária</div>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
                value={distributionMode}
                onChange={(e) => setDistributionMode(e.target.value as 'constante' | 'curvaS')}
              >
                <option value="constante">Constante</option>
                <option value="curvaS">Curva S</option>
              </select>
            </div>
            {distributionMode === 'curvaS' && (
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Intensidade da curva (k)</div>
                <input
                  type="range"
                  min={0.2}
                  max={1.2}
                  step={0.05}
                  value={curveIntensity}
                  onChange={(e) => setCurveIntensity(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <div className="text-[11px] text-slate-500 mt-1">Picos mais acentuados com valores maiores ({curveIntensity.toFixed(2)}).</div>
              </div>
            )}
            {distributionMode === 'curvaS' && (
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Posição do pico</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={peakPosition}
                  onChange={(e) => setPeakPosition(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <div className="text-[11px] text-slate-500 mt-1">0 = início • 0,5 = meio • 1 = fim ({peakPosition.toFixed(2)}).</div>
              </div>
            )}
          </div>
          <div className="mt-3 text-[12px] text-slate-400">
            {validDates ? (
              <span>Período selecionado: <span className="text-yellow-400 font-bold">{days}</span> dia(s). Base diária estimada: <span className="text-yellow-400 font-bold">{Math.round(baseDailyRides)}</span> corridas/dia.</span>
            ) : (
              <span className="text-red-400">Selecione datas válidas para calcular as projeções.</span>
            )}
          </div>
        </div>

        {validDates && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Corridas estimadas no período</div>
              <div className="text-2xl font-black text-white" data-testid="event-total-rides"><NumberDisplay value={totalEventRides} /></div>
              <div className="text-[11px] text-slate-500">Base: {baseEventRides} • Adic.: {ridesExtraPct}%</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Tarifa média com dinâmica</div>
              <div className="text-2xl font-black text-gradient-gold" data-testid="event-avg-fare-adj"><CurrencyDisplay value={avgFareAdj} /></div>
              <div className="text-[11px] text-slate-500">Base: <span data-testid="event-avg-fare-base"><CurrencyDisplay value={avgFareBase} /></span> • Dinâmica: {dynamicPct || 0}%</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black mb-1">% lucro extra por corrida</div>
              <div className="text-2xl font-black text-gradient-green"><PercentDisplay value={extraProfitPerRidePct} /></div>
              <div className="text-[11px] text-slate-500">Considerando take rate de {(takeRate * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {validDates && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black mb-2">Faturamento estimado do evento</div>
              <div className="grid grid-cols-2 gap-4 text-slate-200">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">GMV (corridas x tarifa)</div>
                  <div className="text-xl font-black text-gradient-gold" data-testid="event-gmv"><CurrencyDisplay value={gmvEvent} /></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Receita plataforma (take rate)</div>
                  <div className="text-xl font-black text-gradient-gold" data-testid="event-platform-revenue"><CurrencyDisplay value={plataformaReceita} /></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Corridas/dia necessárias</div>
                  <div className="text-xl font-black" data-testid="event-rides-per-day-required"><NumberDisplay value={corridasDiaNecessarias} /></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Corridas por driver/dia</div>
                  <div className="text-xl font-black"><NumberDisplay value={Math.ceil(corridasPorDriverDia)} /></div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black mb-2">Capacidade de atendimento</div>
              <div className="grid grid-cols-2 gap-4 text-slate-200">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Drivers informados</div>
                  <div className="text-xl font-black" data-testid="event-drivers-input"><NumberDisplay value={driversNeeded || 0} /></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Capacidade (corridas)</div>
                  <div className="text-xl font-black" data-testid="event-capacity"><NumberDisplay value={driversCapacity} /></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Cobertura da demanda</div>
                  <div className={`text-xl font-black ${coberturaPct >= 100 ? 'text-gradient-green' : 'text-yellow-300'}`} data-testid="event-coverage"><PercentDisplay value={coberturaPct} /></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Drivers sugeridos</div>
                  <div className="text-xl font-black" data-testid="event-drivers-suggested"><NumberDisplay value={driversSugeridos} /></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {validDates && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black mb-2">Corridas/dia x Capacidade (período do evento)</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={eventDailyData}>
                <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#475569" fontSize={10} label={{ value: 'Dia', position: 'insideBottomRight', offset: -4, fill: '#94a3b8' }} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
                <Legend content={<NeutralLegend />} />
                <ReferenceLine x={peakDay} stroke="#eab308" strokeDasharray="4 2" label={{ value: `Pico (Dia ${peakDay})`, position: 'top', fill: '#eab308', fontSize: 10 }} />
                <defs>
                  <linearGradient id="gradRidesEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <Bar dataKey="rides" name="Corridas/dia" fill="url(#gradRidesEventos)" radius={[8,8,2,2]} opacity={0.95} stroke="#0b1220" strokeWidth={2} />
                <Line type="monotone" dataKey="capacity" name="Capacidade/dia" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: '#16a34a', stroke: '#0b1220', strokeWidth: 1 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const renderHeatDemand = () => {
    const heatZones = [
      { name: 'Centro / Estação', status: 'Crítico', peak: '12h-14h / 18h-19h', load: 95, drivers: '25-30', dynamic: '1.4x' },
      { name: 'Leporace / Brasilândia', status: 'Alto', peak: '06h-08h / 17h-19h', load: 82, drivers: '15-20', dynamic: '1.2x' },
      { name: 'City Petrópolis / Aeroporto', status: 'Médio', peak: '07h-09h / Finais de Semana', load: 68, drivers: '10-15', dynamic: '1.1x' },
      { name: 'Distrito Industrial', status: 'Focal', peak: '05h-06h / 14h-15h / 22h-23h', load: 55, drivers: '8-12', dynamic: '1.0x' },
    ];
    
    const hourlyDemandData = [
      { time: '00h', value: 20 }, { time: '02h', value: 10 }, { time: '04h', value: 15 },
      { time: '06h', value: 60 }, { time: '08h', value: 90 }, { time: '10h', value: 55 },
      { time: '12h', value: 85 }, { time: '14h', value: 60 }, { time: '16h', value: 70 },
      { time: '18h', value: 95 }, { time: '20h', value: 75 }, { time: '22h', value: 40 },
    ];

    const statusColor: Record<string, string> = {
      Crítico: '#ef4444',
      Alto: '#f59e0b',
      Médio: '#eab308',
      Focal: '#fbbf24',
    };
    
    const ticketBench = [
      { name: 'Uber', value: 20, fill: '#0b1220' },
      { name: '99', value: 18, fill: '#f59e0b' },
      { name: 'Maxim', value: 14.8, fill: '#eab308' },
      { name: 'Garupa', value: 21, fill: '#e5e7eb' },
      { name: 'Urban 66', value: 17.5, fill: '#ef4444' },
      { name: 'TKX Franca', value: 18.5, fill: '#fbbf24' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Top Section: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Hourly Demand */}
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase text-yellow-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Perfil de Demanda Horária (Média)
                  </h3>
                  <p className="text-xs text-slate-500">Concentração de solicitações ao longo do dia</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyDemandData}>
                    <defs>
                      <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                      itemStyle={{ color: '#eab308' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorDemand)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Heat Zones Chart */}
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase text-yellow-500 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Intensidade por Zona
                  </h3>
                  <p className="text-xs text-slate-500">Taxa de ocupação e demanda relativa</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatZones} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#475569" fontSize={10} hide />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={100} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="load" name="Taxa de Embarque" radius={[0, 4, 4, 0]} barSize={20}>
                      {heatZones.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={statusColor[entry.status]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Zone Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {heatZones.map((zone) => (
            <div key={zone.name} className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-yellow-500/30 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider`} style={{ backgroundColor: `${statusColor[zone.status]}20`, color: statusColor[zone.status] }}>
                  {zone.status}
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs font-bold">{zone.dynamic}</span>
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-100 mb-1 group-hover:text-yellow-400 transition-colors">{zone.name}</h4>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Pico:</span>
                  <span className="text-slate-200">{zone.peak}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Drivers Sugeridos:</span>
                  <span className="text-slate-200">{zone.drivers}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${zone.load}%`, backgroundColor: statusColor[zone.status] }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benchmark Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black uppercase text-yellow-500 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Competitividade de Preço (Ticket Médio)
              </h3>
              <p className="text-xs text-slate-500">Comparativo de tarifas praticadas em Franca-SP</p>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketBench} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Ticket Médio']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {ticketBench.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.name === 'TKX Franca' ? '#fbbf24' : 'none'} strokeWidth={entry.name === 'TKX Franca' ? 2 : 0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderDrivers = () => {
    const MPD = 10.1; // Média de Produtividade Diária
    const startMonth = (yearPeriod - 1) * 12;
    const endMonth = yearPeriod * 12;
    const rows = displayProjections.slice(startMonth, endMonth).map((r) => {
      const target = Math.max(50, Math.round(r.users / 200));
      const cov = r.users > 0 ? (r.drivers * 200) / r.users : 0;
      const gap = r.drivers - target;
      const supplyCapacity = r.supplyCapacity || (r.drivers * MPD * 30.5);
      const demandedRides = r.demandedRides || r.rides;
      const utilizacao = supplyCapacity > 0 ? (r.rides / supplyCapacity) * 100 : 0;
      const isBottleneck = r.isSupplyBottleneck || false;
      const demandGap = r.demandGap || 0;
      return { ...r, target, cov, gap, supplyCapacity, demandedRides, utilizacao, isBottleneck, demandGap };
    });

    const bottleneckMonths = rows.length > 0 ? rows.filter(r => r.isBottleneck).length : 0;
    const avgUtilization = rows.length > 0 ? rows.reduce((a, r) => a + r.utilizacao, 0) / rows.length : 0;
    const maxGap = rows.length > 0 ? Math.max(...rows.map(r => r.demandGap)) : 0;

    return (
      <div className="space-y-3">
        {/* Perfil da Frota (M36) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-yellow-500 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Perfil Operacional da Frota (Meta M36)
              </h3>
              <p className="text-xs text-slate-400">Distribuição para 296 motoristas ativos (Produtividade Média: 11,5 corridas/dia)</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-white">296</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Total Ativos</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DRIVER_PROFILES.map((profile) => (
              <div key={profile.name} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: profile.color }}></div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-200 uppercase">{profile.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{profile.desc}</div>
                  </div>
                  <div className="text-xl font-black" style={{ color: profile.color }}>{profile.count}</div>
                </div>
                <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${(profile.count / 296) * 100}%`, backgroundColor: profile.color }}></div>
                </div>
                <div className="text-[9px] text-right text-slate-500 mt-1">
                  {((profile.count / 296) * 100).toFixed(0)}% da frota
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((period) => (
            <button
              key={period}
              onClick={() => setYearPeriod(period as 1 | 2 | 3)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                yearPeriod === period
                  ? 'bg-yellow-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Ano {period} (M{(period - 1) * 12 + 1}-{period * 12})
            </button>
          ))}
        </div>
        <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">Análise Mensal de Gap & Capacidade (MPD 10,1)</h3>
        
        {/* Alertas de Gargalo */}
        {bottleneckMonths > 0 && (
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/10 border border-red-500/40 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="text-sm font-bold text-red-300">ALERTA: Gargalo de Oferta Detectado!</div>
                <div className="text-xs text-slate-300 mt-1">
                  <strong>{bottleneckMonths} meses</strong> com frota insuficiente. 
                  Gap máximo: <strong>{Math.round(maxGap).toLocaleString('pt-BR')} corridas/mês</strong>.
                  Com <strong>+10 motoristas/mês</strong>, será necessário <strong>{Math.ceil(maxGap / (MPD * 30.5))} motoristas adicionais</strong> para atender demanda.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card-gradient border border-slate-700/40 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-slate-200">
            <thead className="bg-gradient-to-r from-slate-800 to-slate-900 text-[7px] uppercase text-slate-400 font-bold">
              <tr> 
                <th className="p-2 text-left">Mês</th>
                <th className="p-2 text-right">Usuários</th>
                <th className="p-2 text-right">Frota</th>
                <th className="p-2 text-right">Corridas/dia (zona conforto)</th>
                <th className="p-2 text-right">Corridas/mês (driver)</th>
                <th className="p-2 text-right">Driver/dia (Corridas Potencial)</th>
                <th className="p-2 text-right">Demanda</th>
                <th className="p-2 text-right">Capacidade</th>
                <th className="p-2 text-right">Realizado</th>
                <th className="p-2 text-right">Gap Corridas</th>
                <th className="p-2 text-right">Utiliz. MPD</th>
                <th className="p-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {rows.map((r, idx) => {
                const opData = OPERATIONAL_GROWTH[r.month - 1];
                return (
                <tr key={r.month} className={`${idx % 2 === 0 ? 'bg-slate-900/30' : ''} ${r.isBottleneck ? 'bg-red-900/10' : ''}`}>
                  <td className="p-2 font-bold text-slate-100">
                    M{r.month} <span className="text-[9px] font-normal text-slate-500 block">{opData?.phase}</span>
                  </td>
                  <td className="p-2 text-right"><NumberDisplay value={r.users} /></td>
                  <td className="p-2 text-right"><NumberDisplay value={r.drivers} /></td>
                  <td className="p-2 text-right text-cyan-400">{(r.rides / r.drivers / 30.5).toFixed(2)}</td>
                  <td className="p-2 text-right text-cyan-400"><NumberDisplay value={Math.round(r.rides / r.drivers)} /></td>
                  <td className="p-2 text-right text-purple-400">{((r.rides + r.demandGap) / r.drivers / 30.5).toFixed(2)}</td>
                  <td className="p-2 text-right text-blue-400"><NumberDisplay value={Math.round(r.demandedRides)} /></td>
                  <td className="p-2 text-right text-green-400"><NumberDisplay value={Math.round(r.supplyCapacity)} /></td>
                  <td className="p-2 text-right"><NumberDisplay value={r.rides} /></td>
                  <td className={`p-2 text-right ${r.demandGap > 0 ? 'text-red-400 font-bold' : 'text-green-400'}`}>
                    {r.demandGap > 0 ? `-${Math.round(r.demandGap).toLocaleString('pt-BR')}` : '✓'}
                  </td>
                  <td className={`p-2 text-right ${r.utilizacao > 90 ? 'text-red-400' : r.utilizacao > 70 ? 'text-orange-400' : 'text-green-400'}`}>
                    {r.utilizacao.toFixed(1)}%
                  </td>
                  <td className="p-2 text-center">
                    {r.isBottleneck ? <span className="text-red-400 font-bold">🔴 BOTTLENECK</span> : <span className="text-green-400">✓</span>}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="card-gradient bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold mb-1">MPD (Produtividade)</div>
            <div className="text-lg font-black text-blue-400">{MPD} corridas/dia</div>
            <div className="text-[10px] text-slate-400 mt-1">30% Full + 40% Part + 30% Espor.</div>
          </div>
          <div className="card-gradient bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold mb-1">Utilização Média (12m)</div>
            <div className="text-lg font-black text-green-400">{avgUtilization.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-400 mt-1">Eficiência da frota</div>
          </div>
          <div className={`card-gradient bg-gradient-to-br ${bottleneckMonths > 0 ? 'from-red-500/10 to-orange-500/5' : 'from-green-500/10 to-emerald-500/5'} border border-slate-700/40 p-3 rounded-lg`}>
            <div className="text-[7px] uppercase text-slate-400 font-bold mb-1">Meses com Gargalo</div>
            <div className={`text-lg font-black ${bottleneckMonths > 0 ? 'text-red-400' : 'text-green-400'}`}>{bottleneckMonths}/12</div>
            <div className="text-[10px] text-slate-400 mt-1">{bottleneckMonths > 0 ? 'Frota insuficiente' : 'Capacidade OK'}</div>
          </div>
          <div className="card-gradient bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold mb-1">Gap Máximo</div>
            <div className={`text-lg font-black ${maxGap > 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {maxGap > 0 ? Math.round(maxGap).toLocaleString('pt-BR') : '0'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Corridas perdidas/mês</div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjecoes = () => (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[1, 2, 3].map((period) => (
          <button
            key={period}
            onClick={() => setYearPeriod(period as 1 | 2 | 3)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              yearPeriod === period
                ? 'bg-yellow-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ano {period} (M{(period - 1) * 12 + 1}-{period * 12})
          </button>
        ))}
      </div>
      <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">Projeções de Volume (36 meses)</h3>
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayProjections.slice((yearPeriod - 1) * 12, yearPeriod * 12)}>
            <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#475569" fontSize={10} />
            <YAxis yAxisId="left" stroke="#475569" fontSize={10} />
            <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} />
            <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
            <Legend content={<NeutralLegend />} />
            <defs>
              <linearGradient id="gradRidesWarm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <Bar yAxisId="left" dataKey="rides" name="Corridas" fill="url(#gradRidesWarm)" radius={[8, 8, 2, 2]} opacity={0.95} stroke="#0b1220" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="drivers" name="Frota" stroke="#ef4444" strokeWidth={3} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="users" name="Usuários" stroke="#e5e7eb" strokeWidth={3} dot={false} strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderKpis = () => {
    const last = displayProjections[displayProjections.length - 1];
    const first = displayProjections[0];
    const ratio = (last?.ltv || 0) / ((last?.cac || 1));
    const cagr = Math.pow(displayProjections[11].grossRevenue / (first?.grossRevenue || 1), 1/2) - 1;
    
    // Dados para gráfico de evolução LTV/CAC
    const ltvCacData = displayProjections.map(p => ({
      month: p.month,
      monthName: p.monthName,
      cac: p.cac,
      ltv: p.ltv,
      ratio: p.cac > 0 ? p.ltv / p.cac : 0,
    }));
    
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">KPIs de Viabilidade</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="card-gradient hover-lift bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-lg font-black text-green-400"><CurrencyDisplay value={last?.ltv} /></div>
            <div className="text-[9px] text-slate-400 mt-1">Lifetime Value</div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[7px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-1">CAC (M36)</div>
            <div className="text-lg font-black text-yellow-400"><CurrencyDisplay value={last?.cac} /></div>
            <div className="text-[9px] text-slate-400 mt-1">Customer Acquisition</div>
          </div>
          <div className={`card-gradient hover-lift bg-gradient-to-br ${ratio >= 3 ? 'from-green-500/10 to-emerald-500/5' : 'from-orange-500/10 to-amber-500/5'} border border-slate-700/40 p-3 rounded-lg`}>
            <div className="text-[7px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-1">LTV/CAC (M36)</div>
            <div className={`text-lg font-black ${ratio >= 3 ? 'text-green-400' : ratio >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>{ratio.toFixed(2)}x</div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[7px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-1">CAGR (Ano 1-2)</div>
            <div className="text-lg font-black text-blue-400"><PercentDisplay value={(cagr || 0) * 100} /></div>
            <div className="text-[9px] text-slate-400 mt-1">Crescimento Anual</div>
          </div>
        </div>
        {/* Gráfico de Evolução LTV/CAC */}
        <div className="card-gradient border border-slate-700/40 rounded-xl p-4 bg-slate-900/50">
          <div className="text-[8px] uppercase text-slate-400 font-black mb-3 tracking-[0.08em]">Evolução de LTV, CAC e Ratio ao Longo de 36 Meses</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={ltvCacData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="monthName" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} stroke="#64748b" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} stroke="#94a3b8" />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
              <Legend content={<NeutralLegend />} />
              <Line yAxisId="left" type="monotone" dataKey="ltv" name="LTV" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="cac" name="CAC" stroke="#ef4444" strokeWidth={2.5} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="ratio" name="LTV/CAC Ratio" stroke="#eab308" strokeWidth={2.5} dot={false} strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderCenarios = () => {
    const scenarioProjections: Record<ScenarioType, any[]> = {
      [ScenarioType.REALISTA]: displayProjections, // Usando a projeção baseada na tabela para o cenário atual
      [ScenarioType.PESSIMISTA]: displayProjections.map(p => ({ ...p, grossRevenue: p.grossRevenue * 0.8, netProfit: p.netProfit * 0.7 })), // Simulação simples
      [ScenarioType.OTIMISTA]: displayProjections.map(p => ({ ...p, grossRevenue: p.grossRevenue * 1.2, netProfit: p.netProfit * 1.3 })),
    };

    const scenariosData = Object.values(ScenarioType).map((t) => {
      const proj = scenarioProjections[t];
      const last = proj[proj.length - 1];
      const totalProfit = proj.reduce((a, b) => a + b.netProfit, 0);
      const breakEvenIdx = proj.findIndex((r) => r.netProfit > 0);
      const paybackIdx = proj.findIndex((r) => r.accumulatedProfit > 0);
      const y1 = proj.slice(0, 12);
      const y2 = proj.slice(12, 24);
      const y3 = proj.slice(24, 36);
      const profitY1 = y1.reduce((a, m) => a + m.netProfit, 0);
      const profitY2 = y2.reduce((a, m) => a + m.netProfit, 0);
      const profitY3 = y3.reduce((a, m) => a + m.netProfit, 0);
      const finalMarginEbitda = last.takeRateRevenue > 0 ? (last.ebitda / last.takeRateRevenue) * 100 : 0;
      const finalLtvCac = last.cac > 0 ? last.ltv / last.cac : 0;
      const paybackWindow = paybackIdx === -1 ? proj : proj.slice(0, paybackIdx + 1);
      const paybackDepth = paybackWindow.reduce((min, r) => Math.min(min, r.accumulatedProfit), 0);
      const bottleneck12 = proj.slice(0, 12).filter((r) => r.isSupplyBottleneck).length;
      const bottleneck36 = proj.filter((r) => r.isSupplyBottleneck).length;
      return {
        type: t as ScenarioType,
        totalProfit,
        breakEvenIdx,
        paybackIdx,
        share: (last.users / FRANCA_STATS.digitalUsers) * 100,
        profitY1,
        profitY2,
        profitY3,
        finalMarginEbitda,
        finalLtvCac,
        paybackDepth,
        bottleneck12,
        bottleneck36,
      };
    });

    const formatDelta = (current: number, previous?: number | null) => {
      if (previous === undefined || previous === null) return null;
      if (Math.abs(previous) < 1e-6) return null;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const DeltaBadge: React.FC<{ delta: number | null }> = ({ delta }) => {
      if (delta === null) return <span className="text-slate-500 text-[10px]">—</span>;
      const arrow = delta >= 0 ? '▲' : '▼';
      const color = delta >= 0 ? 'text-green-400' : 'text-red-400';
      return <span className={`text-[11px] font-bold ${color}`}>{arrow} {Math.abs(delta).toFixed(1)}%</span>;
    };

    const buildCardData = (proj: MonthlyResult[], month: number, prevMonth?: number) => {
      const current = proj[month - 1];
      const prev = prevMonth ? proj[prevMonth - 1] : null;
      const opCosts = current.variableCosts + current.fixedCosts + current.tech + current.marketing;
      const opCostsPrev = prev ? prev.variableCosts + prev.fixedCosts + prev.tech + prev.marketing : null;
      const ebitdaMargin = current.takeRateRevenue > 0 ? (current.ebitda / current.takeRateRevenue) * 100 : 0;
      const ebitdaMarginPrev = prev && prev.takeRateRevenue > 0 ? (prev.ebitda / prev.takeRateRevenue) * 100 : null;
      return {
        month,
        drivers: { value: current.drivers, delta: formatDelta(current.drivers, prev?.drivers) },
        users: { value: current.users, delta: formatDelta(current.users, prev?.users) },
        revenue: { value: current.grossRevenue, delta: formatDelta(current.grossRevenue, prev?.grossRevenue) },
        takeRate: { value: current.takeRateRevenue, delta: formatDelta(current.takeRateRevenue, prev?.takeRateRevenue) },
        taxes: { value: current.taxes, delta: formatDelta(current.taxes, prev?.taxes) },
        opCosts: { value: opCosts, delta: formatDelta(opCosts, opCostsPrev) },
        profit: { value: current.netProfit, delta: formatDelta(current.netProfit, prev?.netProfit) },
        ebitdaMargin: { value: ebitdaMargin, delta: formatDelta(ebitdaMargin, ebitdaMarginPrev) },
      };
    };

    const semestralComparisons = Object.values(ScenarioType).map((t) => {
      const proj = scenarioProjections[t];
      const paybackIdx = proj.findIndex((r) => r.accumulatedProfit > 0);
      const paybackMonth = paybackIdx !== -1 ? paybackIdx + 1 : null;
      const blocoJunho = [
        buildCardData(proj, 6),
        buildCardData(proj, 18, 6),
        buildCardData(proj, 30, 18),
      ];
      const blocoDez = [
        buildCardData(proj, 12),
        buildCardData(proj, 24, 12),
        buildCardData(proj, 36, 24),
      ];
      return { type: t as ScenarioType, blocoJunho, blocoDez, paybackMonth };
    });

    return (
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase text-yellow-500">Comparativo semestral (mesmo período até 36º Mês)</h3>
        <div className="space-y-4">
          {semestralComparisons.map((s) => {
            const june = s.blocoJunho;
            const dec = s.blocoDez;
            const renderRow = (label: string, key: keyof typeof june[0], isPercent = false, isPeople = false, isProfitRow = false) => (
              <div className="grid grid-cols-4 items-center px-3 py-2 rounded-lg bg-slate-800/40">
                <span className="text-[11px] uppercase text-slate-400 font-bold">{isProfitRow ? 'Lucro / Prejuízo' : label}</span>
                {[june[0], june[1], june[2]].map((card, idx) => {
                  const metric = (card as any)[key];
                  const value = metric?.value ?? 0;
                  const displayValue = isProfitRow ? profitValue(value) : value;
                  const formatted = isPercent ? `${value.toFixed(1)}%` : isPeople ? formatNumber(displayValue) : formatCurrency(displayValue);
                  const color = isProfitRow ? profitColor(value) : 'text-slate-200';
                  const labelTag = isProfitRow ? profitLabel(value, 'Lucro', 'Prejuízo') : null;
                  return (
                    <div key={`${label}-jun-${idx}`} className="flex flex-col items-end gap-1 text-xs text-slate-200">
                      <span className={`font-mono font-semibold ${color}`}>{formatted}</span>
                      <div className="flex items-center gap-2">
                        <DeltaBadge delta={metric?.delta ?? null} />
                        {labelTag && <span className={`text-[10px] font-bold ${color}`}>{labelTag}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );

            const renderRowDec = (label: string, key: keyof typeof dec[0], isPercent = false, isPeople = false, isProfitRow = false) => (
              <div className="grid grid-cols-4 items-center px-3 py-2 rounded-lg bg-slate-800/30">
                <span className="text-[11px] uppercase text-slate-400 font-bold">{isProfitRow ? 'Lucro / Prejuízo' : label}</span>
                {[dec[0], dec[1], dec[2]].map((card, idx) => {
                  const metric = (card as any)[key];
                  const value = metric?.value ?? 0;
                  const displayValue = isProfitRow ? profitValue(value) : value;
                  const formatted = isPercent ? `${value.toFixed(1)}%` : isPeople ? formatNumber(displayValue) : formatCurrency(displayValue);
                  const color = isProfitRow ? profitColor(value) : 'text-slate-200';
                  const labelTag = isProfitRow ? profitLabel(value, 'Lucro', 'Prejuízo') : null;
                  return (
                    <div key={`${label}-dec-${idx}`} className="flex flex-col items-end gap-1 text-xs text-slate-200">
                      <span className={`font-mono font-semibold ${color}`}>{formatted}</span>
                      <div className="flex items-center gap-2">
                        <DeltaBadge delta={metric?.delta ?? null} />
                        {labelTag && <span className={`text-[10px] font-bold ${color}`}>{labelTag}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );

            return (
              <div key={s.type} className="bg-slate-900/80 border border-slate-800/70 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-black">{SCENARIO_LABEL[s.type]}</div>
                    <div className="text-xs text-slate-500">Curva S · MPD 10,1 · Projeção final</div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-300">
                    <span className="px-2 py-1 rounded-full bg-slate-800 text-yellow-400 font-black">Projeção final</span>
                    <span className="px-2 py-1 rounded-full bg-slate-800 text-emerald-400 font-black">Payback: {s.paybackMonth ? `M${s.paybackMonth}` : '>36m'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] uppercase text-yellow-400 font-black">
                    <span>Junho: M6 · M18 · M30</span>
                    <span className="text-slate-500">Comparação ano a ano</span>
                  </div>
                  <div className="space-y-1">
                    {renderRow('Frota', 'drivers', false, true)}
                    {renderRow('Usuários', 'users', false, true)}
                    {renderRow('Receita Bruta', 'revenue')}
                    {renderRow('Take Rate', 'takeRate')}
                    {renderRow('Impostos', 'taxes')}
                    {renderRow('Custos Operacionais', 'opCosts')}
                    {renderRow('Margem EBITDA', 'ebitdaMargin', true)}
                    {renderRow('Lucro Líquido', 'profit', false, false, true)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] uppercase text-yellow-400 font-black">
                    <span>Dezembro: M12 · M24 · M36</span>
                    <span className="text-slate-500">Comparação ano a ano</span>
                  </div>
                  <div className="space-y-1">
                    {renderRowDec('Frota', 'drivers', false, true)}
                    {renderRowDec('Usuários', 'users', false, true)}
                    {renderRowDec('Receita Bruta', 'revenue')}
                    {renderRowDec('Take Rate', 'takeRate')}
                    {renderRowDec('Impostos', 'taxes')}
                    {renderRowDec('Custos Operacionais', 'opCosts')}
                    {renderRowDec('Margem EBITDA', 'ebitdaMargin', true)}
                    {renderRowDec('Lucro Líquido', 'profit', false, false, true)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <h3 className="text-sm font-black uppercase text-yellow-500">Comparação de Cenários (36 meses)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenariosData.map((s) => (
            <div key={s.type} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black">{SCENARIO_LABEL[s.type]}</div>
              <div className="text-sm text-slate-300">Break-even: {s.breakEvenIdx !== -1 ? `Mês ${s.breakEvenIdx + 1}` : '—'}</div>
              <div className="text-sm text-slate-300">Payback: {s.paybackIdx !== -1 ? `Mês ${s.paybackIdx + 1}` : '—'}</div>
              <div className="text-sm text-slate-300">Margem EBITDA (projeção final): {s.finalMarginEbitda.toFixed(1)}%</div>
              <div className="text-sm text-slate-300">LTV/CAC (projeção final): {s.finalLtvCac.toFixed(2)}x</div>
              <div className="text-sm text-slate-300">Pior caixa até payback: {formatCurrency(s.paybackDepth)}</div>
              <div className="text-sm text-slate-300">Gargalo de oferta: {s.bottleneck12}/12 • {s.bottleneck36}/36</div>
              <div className="text-sm text-slate-300">Share (M36): {s.share.toFixed(1)}%</div>
            </div>
          ))}
        </div>
        <h3 className="text-sm font-black uppercase text-yellow-500 mt-6">Lucro / Prejuízo por Ano (comparação)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenariosData.map((s) => (
            <div key={s.type + '_yearly'} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black">{SCENARIO_LABEL[s.type]}</div>
              <div className={`text-sm ${s.profitY1 >= 0 ? 'text-green-400' : 'text-red-400'}`}>Ano 1: {formatCurrency(s.profitY1)}</div>
              <div className={`text-sm ${s.profitY2 >= 0 ? 'text-green-400' : 'text-red-400'}`}>Ano 2: {formatCurrency(s.profitY2)}</div>
              <div className={`text-sm ${s.profitY3 >= 0 ? 'text-green-400' : 'text-red-400'}`}>Ano 3: {formatCurrency(s.profitY3)}</div>
            </div>
          ))}
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={Array.from({ length: 36 }, (_, i) => ({
                month: i + 1,
                Realista: scenarioProjections[ScenarioType.REALISTA][i].accumulatedProfit,
                Pessimista: scenarioProjections[ScenarioType.PESSIMISTA][i].accumulatedProfit,
                Otimista: scenarioProjections[ScenarioType.OTIMISTA][i].accumulatedProfit,
              }))}
            >
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" stroke="#475569" fontSize={10} />
              <YAxis stroke="#475569" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
              <Legend content={<NeutralLegend />} />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="Realista" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Pessimista" stroke="#ef4444" strokeWidth={2.5} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="Otimista" stroke="#eab308" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderVisao36m = () => {
    const results = displayProjections;
    const breakEvenIndex = results.findIndex((r) => r.netProfit > 0);
    const paybackIndex = results.findIndex((r) => r.accumulatedProfit > 0);
    const totalRides36 = results.reduce((acc, curr) => acc + curr.rides, 0);
    const totalProfit36 = results.reduce((acc, curr) => acc + curr.netProfit, 0);

    // Calcula corridas por driver a cada 6 meses
    const semesterRidesPerDriver = [
      { label: 'Semestre 1 (M1-M6)', data: results.slice(0, 6) },
      { label: 'Semestre 2 (M7-M12)', data: results.slice(6, 12) },
      { label: 'Semestre 3 (M13-M18)', data: results.slice(12, 18) },
      { label: 'Semestre 4 (M19-M24)', data: results.slice(18, 24) },
      { label: 'Semestre 5 (M25-M30)', data: results.slice(24, 30) },
      { label: 'Semestre 6 (M31-M36)', data: results.slice(30, 36) }
    ].map((s) => {
      const d = s.data;
      if (!d.length) return { label: s.label, semesterTotal: 0, monthly: 0, weekly: 0, daily: 0 };
      const totalRides = d.reduce((a, r) => a + r.rides, 0);
      const avgDrivers = d.reduce((a, r) => a + r.drivers, 0) / d.length;
      const semesterTotal = avgDrivers > 0 ? totalRides / avgDrivers : 0;
      const monthly = semesterTotal / 6;
      const weekly = monthly / 4.33; // ~4.33 semanas por mês
      const daily = monthly / 30.5;
      return { label: s.label, semesterTotal, monthly, weekly, daily };
    });

    return (
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase text-yellow-500">Visão 36 meses</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black">Break-even</div>
            <div className="text-2xl font-black text-white">{breakEvenIndex !== -1 ? `Mês ${results[breakEvenIndex].month}` : 'Não atingido'}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black">Payback</div>
            <div className="text-2xl font-black text-white">{paybackIndex !== -1 ? `Mês ${results[paybackIndex].month}` : '> 36m'}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black">{profitLabel(totalProfit36, 'Lucro Acumulado 36m', 'Prejuízo Acumulado 36m')}</div>
            <div className={`text-2xl font-black ${profitColor(totalProfit36)}`}><CurrencyDisplay value={profitValue(totalProfit36)} colorClass={profitColor(totalProfit36)} /></div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black">Corridas por Driver - A Cada 6 Meses</div>
            <div className="space-y-2 text-[9px] mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {semesterRidesPerDriver.map((s) => (
                  <div key={s.label} className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
                    <div className="text-[8px] uppercase text-slate-400 font-bold mb-2">{s.label}</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-400">Semestre:</span>
                        <span className="text-sm font-black text-yellow-400">{s.semesterTotal.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-400">Mensal:</span>
                        <span className="text-xs font-bold text-green-400">{s.monthly.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-400">Semanal:</span>
                        <span className="text-xs font-bold text-blue-400">{s.weekly.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-400">Diária:</span>
                        <span className="text-xs font-bold text-orange-400">{s.daily.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black">Corridas Totais 36m</div>
            <div className="text-xl font-black text-white">{formatNumber(totalRides36)}</div>
          </div>
        </div>
        <h3 className="text-sm font-black uppercase text-yellow-500 mt-6">Indicadores Anuais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[{ label: 'Ano 1', data: yearlyMetrics.y1 }, { label: 'Ano 2', data: yearlyMetrics.y2 }, { label: 'Ano 3', data: yearlyMetrics.y3 }].map((y) => (
            <div key={y.label} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase text-slate-400 font-black">{y.label}</div>
              <div className="text-lg font-black text-white mt-1">Receita: {formatCurrency(y.data.revenue)}</div>
              <div className={`text-sm ${profitColor(y.data.profit)}`}>
                {profitLabel(y.data.profit)}: <CurrencyDisplay value={profitValue(y.data.profit)} colorClass={profitColor(y.data.profit)} />
              </div>
              <div className="text-sm text-slate-300">Corridas: {formatNumber(y.data.rides)}</div>
              <div className="text-sm text-slate-300">Usuários: {formatNumber(y.data.finalUsers)}</div>
              <div className="text-sm text-slate-300">Frota: {formatNumber(y.data.finalDrivers)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDre = () => (
    <div className="space-y-3">
      {!currentParams.minCostsEnabled && (
        <div className="bg-red-900 border border-red-500 p-4 rounded text-red-200 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <strong>Alerta: Custos Mínimos Desativados</strong>
            <p className="text-xs mt-1">Alguns custos fixos podem não ser aplicados ao DRE. Reative na aba Marketing para retomar valores padrão.</p>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {[1, 2, 3].map((period) => (
          <button
            key={period}
            onClick={() => setYearPeriod(period as 1 | 2 | 3)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              yearPeriod === period
                ? 'bg-yellow-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ano {period} (M{(period - 1) * 12 + 1}-{period * 12})
          </button>
        ))}
      </div>
      <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">DRE detalhado</h3>
      <div className="card-gradient border border-slate-700/40 rounded-xl overflow-hidden">
        <table className="w-full text-xs text-slate-200">
          <thead className="bg-gradient-to-r from-slate-800 to-slate-900 text-[7px] uppercase text-slate-400 font-bold">
            <tr>
              <th className="p-2 text-left">Fase</th>
              <th className="p-2 text-left">Mês</th>
              <th className="p-2 text-right">GMV</th>
              <th className="p-2 text-right">Take 15%</th>
              <th className="p-2 text-right">Meritocracia</th>
              <th className="p-2 text-right">Receita</th>
              <th className="p-2 text-right">Impostos</th>
              <th className="p-2 text-right">Fixos</th>
              <th className="p-2 text-right">Marketing</th>
              <th className="p-2 text-right">Tech</th>
              <th className="p-2 text-right">Variáveis</th>
              <th className="p-2 text-right">Elite Drivers</th>
              <th className="p-2 text-right">Fid. Passag.</th>
              <th className="p-2 text-right">Res. Oper.</th>
              <th className="p-2 text-right">Lucro / Prejuízo</th>
              <th className="p-2 text-right">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {displayProjections.slice((yearPeriod - 1) * 12, yearPeriod * 12).map((row, idx) => {
              const opData = OPERATIONAL_GROWTH[row.month - 1];
              return (
              <tr key={row.month} className={idx % 2 === 0 ? 'bg-slate-900/30' : ''}>
                <td className="p-2 text-[9px] font-bold text-yellow-500/80 uppercase tracking-wider">
                  {opData?.phase || '-'}
                </td>
                <td className="p-2 font-bold text-slate-100">M{row.month}</td>
                <td className="p-2 text-right text-slate-300"><CurrencyDisplay value={row.grossRevenue} /></td>
                <td className="p-2 text-right text-slate-300"><CurrencyDisplay value={row.takeRateGross} /></td>
                <td className="p-2 text-right text-orange-400"><CurrencyDisplay value={-row.cashback} colorClass="text-orange-400" /></td>
                <td className="p-2 text-right font-semibold text-green-400"><CurrencyDisplay value={row.takeRateRevenue} /></td>
                <td className="p-2 text-right text-red-400"><CurrencyDisplay value={-row.taxes} colorClass="text-red-400" /></td>
                <td className="p-2 text-right text-red-400"><CurrencyDisplay value={-row.fixedCosts} colorClass="text-red-400" /></td>
                <td className="p-2 text-right text-red-400"><CurrencyDisplay value={-row.totalMarketing} colorClass="text-red-400" /></td>
                <td className="p-2 text-right text-red-400"><CurrencyDisplay value={-row.totalTech} colorClass="text-red-400" /></td>
                <td className="p-2 text-right text-red-400"><CurrencyDisplay value={-row.variableCosts} colorClass="text-red-400" /></td>
                <td className="p-2 text-right text-orange-400"><CurrencyDisplay value={-row.eliteDriversCost} colorClass="text-orange-400" /></td>
                <td className="p-2 text-right text-orange-400"><CurrencyDisplay value={-row.fidelidadePassageirosCost} colorClass="text-orange-400" /></td>
                <td className="p-2 text-right text-orange-300">
                  {row.reservaOperacionalCost > 0 ? <CurrencyDisplay value={-row.reservaOperacionalCost} colorClass="text-orange-300" /> : <span className="text-slate-600">—</span>}
                </td>
                <td className={`p-2 text-right font-bold ${profitColor(row.netProfit)}`}>
                  <CurrencyDisplay value={profitValue(row.netProfit)} colorClass={profitColor(row.netProfit)} />
                </td>
                <td className={`p-2 text-right ${row.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}><PercentDisplay value={row.margin} /></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-800/30 border border-slate-700/30 p-3 rounded-lg">
        <div className="text-[7px] uppercase text-slate-400 font-bold mb-2">Legenda</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div><span className="font-semibold text-slate-200">GMV:</span> Receita bruta das corridas</div>
          <div><span className="font-semibold text-slate-200">Receita:</span> 11,9% do GMV (média ponderada por faixas)</div>
          <div><span className="font-semibold text-orange-400">Meritocracia:</span> Cashback automático por faixa (0-3,1% GMV)</div>
          <div><span className="font-semibold text-slate-400 text-[10px]">🥉 Ouro 450+ corridas/mês (58,7% vol): 10% | 🥈 Prata 300-449: 12% | 🥉 Bronze 0-299 (41,3% vol): 15%</span></div>
          <div><span className="font-semibold text-slate-200">Fixos:</span> R$8k escalado (+50%/semestre)</div>
          <div><span className="font-semibold text-slate-200">Marketing:</span> R$3k + R$1,5/novo usuário</div>
          <div><span className="font-semibold text-slate-200">Tech:</span> R$0,15/corrida + Bancário (2% GMV)</div>
          <div><span className="font-semibold text-orange-400">Elite Drivers:</span> Premiação semestral (M6, M12, M18...)</div>
          <div><span className="font-semibold text-orange-400">Fid. Passageiros:</span> Sorteio anual (M12, M24, M36)</div>
          <div><span className="font-semibold text-orange-400">Reserva Operacional:</span> % Lucro Líquido (gatilhos/experiências)</div>
        </div>
      </div>
      
      {/* Resumo de Investimento em Fidelidade 36m */}
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/30 p-4 rounded-xl">
        <div className="text-[10px] uppercase text-orange-400 font-black mb-3">💰 Investimento Total em Fidelidade (36 meses)</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Elite Drivers (6x)</div>
            <div className="text-2xl font-black text-orange-300">{formatCurrency(currentParams.eliteDriversSemestral * 6)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Fidelidade Pass. (3x)</div>
            <div className="text-2xl font-black text-orange-300">{formatCurrency(currentParams.fidelidadePassageirosAnual * 3)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Reserva Operacional</div>
            <div className="text-2xl font-black text-orange-300">
              {formatCurrency(displayProjections.reduce((sum, m) => sum + (m.reservaOperacionalCost || 0), 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Total Fidelidade</div>
            <div className="text-3xl font-black text-orange-400">
              {formatCurrency(
                (currentParams.eliteDriversSemestral * 6) + 
                (currentParams.fidelidadePassageirosAnual * 3) + 
                displayProjections.reduce((sum, m) => sum + (m.reservaOperacionalCost || 0), 0)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAudits = () => (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">Resumo anual</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {audits.map((audit) => (
          <div key={audit.year} className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-xl">
            <div className="text-[8px] uppercase text-yellow-400 font-bold tracking-[0.08em] mb-2">Ano {audit.year}</div>
            <div className="space-y-1 text-xs">
              <div><span className="text-slate-400">GMV:</span> <span className="font-semibold text-white"><CurrencyDisplay value={audit.totalGMV} /></span></div>
              <div><span className="text-slate-400">Receita:</span> <span className="font-semibold text-green-400"><CurrencyDisplay value={audit.totalRevenue} /></span></div>
              <div>
                <span className="text-slate-400">{profitLabel(audit.totalNetProfit)}:</span>{' '}
                <span className={`font-semibold ${profitColor(audit.totalNetProfit)}`}>
                  <CurrencyDisplay value={profitValue(audit.totalNetProfit)} colorClass={profitColor(audit.totalNetProfit)} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderResumenEjecutivo = () => {
    if (!displayProjections || displayProjections.length === 0) return null;
    
    const currentMonth = Math.min(12, displayProjections.length);
    const m1 = displayProjections[0];
    const m12 = displayProjections[11];
    const m36 = displayProjections[35];

    // Quebra por período (anos 1, 2, 3 e total)
    const periodSlices = [
      { key: 'y1', label: 'Ano 1', data: displayProjections.slice(0, 12) },
      { key: 'y2', label: 'Ano 2', data: displayProjections.slice(12, 24) },
      { key: 'y3', label: 'Ano 3', data: displayProjections.slice(24, 36) },
      { key: 'total', label: '36m', data: displayProjections }
    ];

    const driverChurnMonthlyRate = 1; // Assumimos 1% de churn mensal da frota como proxy

    const periodSummaries = periodSlices.map((p) => {
      const data = p.data;
      if (!data.length) {
        return {
          label: p.label,
          grossRevenue: 0,
          takeRevenue: 0,
          netProfit: 0,
          valuation: 0,
          churnPassengers: 0,
          churnDrivers: 0
        };
      }

      const grossRevenue = data.reduce((acc, r) => acc + r.grossRevenue, 0);
      const takeRevenue = data.reduce((acc, r) => acc + r.takeRateRevenue, 0);
      const netProfit = data.reduce((acc, r) => acc + r.netProfit, 0);
      const valuation = takeRevenue * 4; // múltiplo simples de 4x receita líquida (take rate)

      const churnPassengers = data.reduce((acc, r, idx) => {
        const prevUsers = idx === 0 ? r.users : data[idx - 1].users;
        return acc + (prevUsers * (currentParams.churnRate || 0) / 100);
      }, 0);

      const churnDrivers = data.reduce((acc, r, idx) => {
        const prevDrivers = idx === 0 ? r.drivers : data[idx - 1].drivers;
        return acc + (prevDrivers * driverChurnMonthlyRate / 100);
      }, 0);

      return {
        label: p.label,
        grossRevenue,
        takeRevenue,
        netProfit,
        valuation,
        churnPassengers,
        churnDrivers,
      };
    });
    
    // Determinar fase de crescimento
    const getGrowthPhase = (month: number): string => {
      if (month <= 6) return 'Fase 1: Aquisição (7% a.m.)';
      if (month <= 24) return 'Fase 2: Expansão (15% a.m.)';
      return 'Fase 3: Maturação (4% a.m.)';
    };
    
    // Sazonalidade do mês atual
    const seasonalityFactor = [0.85, 0.85, 1.0, 1.0, 1.0, 1.0, 0.85, 0.85, 1.0, 1.0, 1.0, 1.2];
    const currentSeasonality = seasonalityFactor[(currentMonth - 1) % 12];
    const seasonalLabel = currentSeasonality < 0.9 ? '⬇️ Sazonalidade Baixa (-15%)' : currentSeasonality > 1.1 ? '⬆️ Sazonalidade Alta (+20%)' : 'Sazonalidade Normal';
    
    // Utilização de capacidade
    const maxCapacity = (m12?.drivers || 0) * 0.85 * 30 * 20;
    const actualRides = m12?.rides || 0;
    const utilizationRate = maxCapacity > 0 ? ((actualRides / maxCapacity) * 100) : 0;
    
    // Gap de frota
    const targetDrivers = m12?.targetDrivers || 0;
    const driverGap = Math.max(0, targetDrivers - (m12?.drivers || 0));
    const gapStatus = driverGap === 0 ? '✅ Meta Atingida' : driverGap > 0 ? `⚠️ ${driverGap} condutores abaixo da meta` : '✅ Acima da meta';
    
    // Break-even
    let breakEvenMonth = 0;
    for (let i = 0; i < displayProjections.length; i++) {
      if (displayProjections[i].netProfit > 0) {
        breakEvenMonth = i + 1;
        break;
      }
    }
    const breakEvenLabel = breakEvenMonth > 0 ? `Mês ${breakEvenMonth}` : 'Não atingido em 36m';
    
    // Growth indicators
    const revenueGrowth = m12 && m1 ? ((m12.grossRevenue - m1.grossRevenue) / m1.grossRevenue * 100) : 0;
    const userGrowth = m12 && m1 ? ((m12.users - m1.users) / m1.users * 100) : 0;
    const profitMargin = m12?.netProfit && m12?.grossRevenue ? ((m12.netProfit / m12.grossRevenue) * 100) : 0;
    
    // Alertas operacionais
    const alerts: string[] = [];
    if (utilizationRate > 85) alerts.push('📊 Capacidade próxima ao limite');
    if (driverGap > 50) alerts.push('🚖 Déficit significativo de frota');
    if (profitMargin < 5 && m12?.netProfit && m12.netProfit > 0) alerts.push('⚠️ Margem de lucro baixa');
    if (supplyBottleneck) alerts.push('📉 Risco de escassez de oferta');
    if (!alerts.length) alerts.push('✅ Operações dentro do esperado');
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">Resumo Executivo</h3>

        {/* Indicadores consolidados ano a ano + total */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="card-gradient hover-lift bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[8px] uppercase text-green-300 font-bold tracking-[0.08em] mb-2">Receita Bruta</div>
            <div className="space-y-1 text-[10px] text-slate-300">
              {periodSummaries.map((p) => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{p.label}</span>
                  <span className="font-black text-green-300"><CurrencyDisplay value={p.grossRevenue} /></span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-gradient hover-lift bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[8px] uppercase text-orange-300 font-bold tracking-[0.08em] mb-2">Lucro / Prejuízo</div>
            <div className="space-y-1 text-[10px] text-slate-300">
              {periodSummaries.map((p) => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{p.label}</span>
                  <span className={`font-black ${profitColor(p.netProfit)}`}><CurrencyDisplay value={profitValue(p.netProfit)} colorClass={profitColor(p.netProfit)} /></span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-gradient hover-lift bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[8px] uppercase text-cyan-300 font-bold tracking-[0.08em] mb-2">Valuation (múltiplo 4x TR)</div>
            <div className="space-y-1 text-[10px] text-slate-300">
              {periodSummaries.map((p) => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{p.label}</span>
                  <span className="font-black text-cyan-300"><CurrencyDisplay value={p.valuation} /></span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-gradient hover-lift bg-gradient-to-br from-red-500/10 to-pink-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[8px] uppercase text-red-300 font-bold tracking-[0.08em] mb-2">Churn</div>
            <div className="space-y-1 text-[10px] text-slate-300">
              {periodSummaries.map((p) => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{p.label}</span>
                  <span className="font-bold text-red-200">Passageiros: <NumberDisplay value={Math.round(p.churnPassengers)} /></span>
                </div>
              ))}
              <div className="border-t border-slate-700/40 pt-2 mt-1 space-y-1">
                {periodSummaries.map((p) => (
                  <div key={`${p.label}-drivers`} className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{p.label}</span>
                    <span className="font-bold text-rose-200">Motoristas: <NumberDisplay value={Math.round(p.churnDrivers)} /></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Per-period metrics: Utilização, Frota, Break-Even, Crescimento Receita/Usuários, Margem */}
        {(() => {
          const MPD = 10.1;
          const periodMetrics = [
            { label: 'Ano 1', data: displayProjections.slice(0, 12) },
            { label: 'Ano 2', data: displayProjections.slice(12, 24) },
            { label: 'Ano 3', data: displayProjections.slice(24, 36) },
            { label: 'Total', data: displayProjections }
          ].map((p) => {
            const d = p.data;
            if (!d.length) return { label: p.label, utilization: 0, fleetSize: 0, breakEvenMonth: '—', revGrowth: 0, userGrowth: 0, profitMargin: 0 };

            const first = d[0];
            const last = d[d.length - 1];
            const maxCap = (last?.drivers || 1) * MPD * 30.5;
            const utilization = maxCap > 0 ? ((d.reduce((a, r) => a + r.rides, 0) / (maxCap * d.length)) * 100) : 0;
            const revGrowth = first?.grossRevenue ? (((last?.grossRevenue || 0) - first.grossRevenue) / first.grossRevenue * 100) : 0;
            const userGrowth = first?.users ? (((last?.users || 0) - first.users) / first.users * 100) : 0;
            const avgNetProfit = d.reduce((a, r) => a + r.netProfit, 0) / d.length;
            const avgGrossRevenue = d.reduce((a, r) => a + r.grossRevenue, 0) / d.length;
            const profitMargin = avgGrossRevenue > 0 ? (avgNetProfit / avgGrossRevenue * 100) : 0;
            
            const breakEven = d.find((r) => r.netProfit > 0);
            const breakEvenMonth = breakEven ? `Mês ${breakEven.month}` : '—';

            return { label: p.label, utilization, fleetSize: last?.drivers || 0, breakEvenMonth, revGrowth, userGrowth, profitMargin };
          });

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              {/* Utilização de Capacidade */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-green-400 font-bold tracking-[0.08em] mb-2">Utilização Capacidade</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {periodMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.label}</span>
                      <span className={`font-black ${m.utilization > 80 ? 'text-orange-400' : 'text-green-400'}`}>{m.utilization.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frota Final */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-orange-400 font-bold tracking-[0.08em] mb-2">Frota Final</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {periodMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.label}</span>
                      <span className="font-black text-orange-300"><NumberDisplay value={m.fleetSize} /></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Break-Even */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-cyan-400 font-bold tracking-[0.08em] mb-2">Break-Even</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {periodMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.label}</span>
                      <span className="font-black text-cyan-300">{m.breakEvenMonth}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crescimento Receita */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-purple-400 font-bold tracking-[0.08em] mb-2">Cresc. Receita</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {periodMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.label}</span>
                      <span className={`font-black ${m.revGrowth > 200 ? 'text-green-400' : m.revGrowth > 100 ? 'text-yellow-400' : 'text-slate-300'}`}>{m.revGrowth.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crescimento Usuários */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-indigo-400 font-bold tracking-[0.08em] mb-2">Cresc. Usuários</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {periodMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.label}</span>
                      <span className={`font-black ${m.userGrowth > 200 ? 'text-green-400' : m.userGrowth > 100 ? 'text-yellow-400' : 'text-slate-300'}`}>{m.userGrowth.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Margem Lucro */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-emerald-400 font-bold tracking-[0.08em] mb-2">Margem Lucro</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {periodMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.label}</span>
                      <span className={`font-black ${m.profitMargin > 10 ? 'text-green-400' : m.profitMargin > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{m.profitMargin.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        
        {/* Projection per period - Final metrics */}
        {(() => {
          const projectionData = [
            { label: 'Ano 1', data: displayProjections.slice(0, 12) },
            { label: 'Ano 2', data: displayProjections.slice(12, 24) },
            { label: 'Ano 3', data: displayProjections.slice(24, 36) },
            { label: 'Total', data: displayProjections }
          ].map((p) => {
            const d = p.data;
            if (!d.length) return { label: p.label, users: 0, drivers: 0, rides: 0, grossRevenue: 0, accumulatedProfit: 0 };
            const last = d[d.length - 1];
            const accumulatedProfit = last.accumulatedProfit;
            const avgRides = d.reduce((a, r) => a + r.rides, 0) / d.length;
            return { label: p.label, users: last.users, drivers: last.drivers, rides: avgRides, grossRevenue: last.grossRevenue, accumulatedProfit };
          });

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              {/* Usuários Finais */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Usuários Finais</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {projectionData.map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{p.label}</span>
                      <span className="font-black text-blue-300"><NumberDisplay value={p.users} /></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frota Final */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Frota Final</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {projectionData.map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{p.label}</span>
                      <span className="font-black text-orange-300"><NumberDisplay value={p.drivers} /></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Corridas/mês (Média) */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Corridas/mês (Méd.)</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {projectionData.map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{p.label}</span>
                      <span className="font-black text-yellow-300"><NumberDisplay value={Math.round(p.rides)} /></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receita Bruta Final */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Receita Bruta</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {projectionData.map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{p.label}</span>
                      <span className="font-black text-green-300"><CurrencyDisplay value={p.grossRevenue} /></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lucro Acumulado Final */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Lucro Acumulado</div>
                <div className="space-y-1 text-[8px] text-slate-300">
                  {projectionData.map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{p.label}</span>
                      <span className={`font-black ${profitColor(p.accumulatedProfit)}`}><CurrencyDisplay value={profitValue(p.accumulatedProfit)} colorClass={profitColor(p.accumulatedProfit)} /></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cenário */}
              <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-3 rounded-lg">
                <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Cenário</div>
                <div className="text-[10px] font-black text-slate-100 mt-2">{SCENARIO_LABEL[scenario]}</div>
                <div className="text-[8px] text-slate-400 mt-2">Inicial: {currentParams.activeDrivers} motoristas + {currentParams.driverAdditionMonthly}/mês</div>
              </div>
            </div>
          );
        })()}
        
        {/* Operational Alerts per Period */}
        {(() => {
          const MPD = 10.1;
          const alertsPerPeriod = [
            { label: 'Ano 1', data: displayProjections.slice(0, 12) },
            { label: 'Ano 2', data: displayProjections.slice(12, 24) },
            { label: 'Ano 3', data: displayProjections.slice(24, 36) },
            { label: 'Total', data: displayProjections }
          ].map((p) => {
            const d = p.data;
            if (!d.length) return { label: p.label, alerts: [] };

            const last = d[d.length - 1];
            const maxCap = (last?.drivers || 1) * MPD * 30.5;
            const utilization = maxCap > 0 ? ((d.reduce((a, r) => a + r.rides, 0) / (maxCap * d.length)) * 100) : 0;
            const avgNetProfit = d.reduce((a, r) => a + r.netProfit, 0) / d.length;
            const avgGrossRevenue = d.reduce((a, r) => a + r.grossRevenue, 0) / d.length;
            const profitMargin = avgGrossRevenue > 0 ? (avgNetProfit / avgGrossRevenue * 100) : 0;

            const alerts: string[] = [];
            if (utilization > 85) alerts.push('⚠️ Capacidade crítica (>85%)');
            if (profitMargin < 0) alerts.push('📉 Prejuízo operacional');
            if (profitMargin >= 0 && profitMargin <= 5) alerts.push('📊 Margem baixa (≤5%)');
            if (!alerts.length) alerts.push('✅ Operações OK');

            return { label: p.label, alerts };
          });

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {alertsPerPeriod.map((ap) => (
                <div key={ap.label} className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-3 rounded-lg">
                  <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">📋 {ap.label}</div>
                  <div className="space-y-1 text-[8px] text-slate-300">
                    {ap.alerts.map((alert, idx) => (
                      <div key={idx} className="font-semibold text-slate-200">{alert}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );
  };

  const renderMarket = () => (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">Mercado (Franca)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-xl">
          <div className="text-[8px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-2">População</div>
          <div className="text-2xl font-black text-white"><NumberDisplay value={FRANCA_STATS.population} /></div>
        </div>
        <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-xl">
          <div className="text-[8px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-2">Usuários Digitais (SAM)</div>
          <div className="text-2xl font-black text-white"><NumberDisplay value={FRANCA_STATS.digitalUsers} /></div>
        </div>
        <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-xl">
          <div className="text-[8px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-2">Meta de Market Share</div>
          <div className="text-2xl font-black text-gradient-gold"><PercentDisplay value={FRANCA_STATS.marketShareTarget} /></div>
        </div>
      </div>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="space-y-6">
            {renderSummaryCards()}
            {renderHeatDemand()}
            {renderMarket()}
          </div>
        );
      case 1:
        return renderBench();
      case 2:
        return renderMarketing();
      case 3:
        return renderParams();
      case 4:
        return renderDrivers();
      case 5:
        return renderProjecoes();
      case 6:
        return renderVisao36m();
      case 7:
        return renderDre();
      case 8:
        return renderKpis();
      case 9:
        return renderCenarios();
      case 10:
        return (
          <div className="space-y-6">
            {renderSummaryCards()}
            {renderAudits()}
          </div>
        );
      case 11:
        return (
          <div className="space-y-6">
            {renderAudits()}
            {renderKpis()}
          </div>
        );
      case 12:
        return renderResumenEjecutivo();
      case 13:
        return <LazyWrapper><ComparisonTab snapshots={snapshots} calculateProjections={calculateProjections} /></LazyWrapper>;
      case 14:
        return <LazyWrapper><TrendAnalysisTab snapshots={snapshots} calculateProjections={calculateProjections} /></LazyWrapper>;
      case 15:
        return renderFestasEventos();
      case 16:
        return <ImplementationTab currentParams={currentParams} />;
      case 17:
        return <InitialPlanningTab currentParams={currentParams} updateCurrentParam={updateCurrentParam} worldMode={worldMode} />;
      case 18:
          return <SensitivityAnalysisTab
            currentParams={currentParams}
            calculateProjections={calculateProjections}
            currentScenario={scenario} />;
case 19:
        return (
          <LazyWrapper>
            <AITab 
              currentParams={currentParams} 
              projections={projections} 
              audits={audits} 
              scenario={scenario} 
            />
          </LazyWrapper>
        );
      default:
        return null;
    }
  }; // <--- Fecha o renderTab

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      >
        <div className="space-y-5 text-white relative">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-5 rounded-xl bg-gradient-to-br from-slate-900/70 to-slate-800/50 border border-slate-700/40 shadow-lg">
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent">TKX Franca Dashboard</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-400 text-xs font-medium">Cenário: <span className="text-yellow-400 font-bold">{SCENARIO_LABEL[scenario]}</span></p>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Mundo:</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded uppercase ${worldMode === 'Real' ? 'bg-green-500 text-slate-950' : 'bg-blue-500 text-white'}`}>
                    {worldMode}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Botão de Troca de Mundo */}
            <div className="absolute top-5 right-5 lg:static lg:top-auto lg:right-auto">
              <button
                onClick={toggleWorld}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase transition-all duration-300 shadow-lg border-2 ${
                  worldMode === 'Real' 
                    ? 'bg-green-600 border-green-400 text-white hover:bg-green-500 hover:shadow-green-500/30' 
                    : 'bg-blue-600 border-blue-400 text-white hover:bg-blue-500 hover:shadow-blue-500/30'
                }`}
              >
                {worldMode === 'Real' ? <Database className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                {worldMode === 'Real' ? 'Mundo Real' : 'Mundo Virtual'}
              </button>
            </div>
            {activeTab !== 15 && renderScenarioSelector()}
          </div>

          {(supplyBottleneck || oversupplyWarning) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {supplyBottleneck && (
                <div className="bg-gradient-to-r from-red-600/20 to-rose-600/10 border-2 border-red-500/50 text-red-100 px-5 py-4 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20">
                  ⚠️ Gargalo de atendimento detectado — aumente frota ou reduza CAC para melhorar cobertura.
                </div>
              )}
              {oversupplyWarning && (
                <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/10 border-2 border-orange-500/50 text-orange-100 px-5 py-4 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20">
                  ⚡ Excesso de oferta de motoristas — ajuste crescimento ou acelere aquisição de usuários.
                </div>
              )}
            </div>
          )}

          {renderTab()}

          {lastMonth && (
            <div className="card-gradient bg-gradient-to-br from-slate-900/90 to-slate-800/70 border border-slate-700/50 p-5 rounded-xl text-slate-200 text-xs shadow-xl">
              <div className="font-black uppercase text-[8px] text-yellow-400 tracking-[0.08em] mb-3">📊 Visão 36 meses</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/30">
                  <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">Frota final</div>
                  <div className="text-lg font-black text-white"><NumberDisplay value={lastMonth.drivers} /></div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/30">
                  <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">Usuários finais</div>
                  <div className="text-lg font-black text-white"><NumberDisplay value={lastMonth.users} /></div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/30">
                  <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">Receita total</div>
                  <div className="text-lg font-black text-gradient-gold"><CurrencyDisplay value={displayProjections.reduce((acc, r) => acc + r.grossRevenue, 0)} /></div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/30">
                  <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">{profitLabel(lastMonth.accumulatedProfit, 'Lucro acumulado', 'Prejuízo acumulado')}</div>
                  <div className={`text-lg font-black ${profitColor(lastMonth.accumulatedProfit, 'text-gradient-green', 'text-gradient-red')}`}>
                    <CurrencyDisplay value={profitValue(lastMonth.accumulatedProfit)} colorClass={profitColor(lastMonth.accumulatedProfit, 'text-gradient-green', 'text-gradient-red')} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>

      <SnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        snapshots={snapshots}
        onSaveSnapshot={handleSaveSnapshot}
        onLoadSnapshot={handleLoadSnapshot}
        onDeleteSnapshot={deleteSnapshot}
        onRenameSnapshot={renameSnapshot}
        onDuplicateSnapshot={duplicateSnapshot}
        onExportSnapshot={exportSingleSnapshot}
        onExportAll={exportSnapshots}
        onImport={importSnapshots}
        currentParamsMap={paramsMap}
        currentScenario={scenario}
      />
    </>
  );
}; // <--- Fecha o componente App

const App: React.FC = () => {
  const [worldMode, setWorldMode] = useState<'Virtual' | 'Real'>(() => {
    return (localStorage.getItem('tkx_world_mode') as 'Virtual' | 'Real') || 'Virtual';
  });
  const [appKey, setAppKey] = useState(0);

  const toggleWorld = () => {
    const currentParams = localStorage.getItem('tkx_simulation_params');
    
    // Salva o estado do mundo atual
    if (currentParams) {
      localStorage.setItem(`tkx_params_${worldMode}`, currentParams);
    }

    // Determina o novo mundo
    const nextMode = worldMode === 'Virtual' ? 'Real' : 'Virtual';
    
    // Carrega o estado do novo mundo
    const nextParams = localStorage.getItem(`tkx_params_${nextMode}`);
    if (nextParams) {
      localStorage.setItem('tkx_simulation_params', nextParams);
    } else {
      // Se não houver dados salvos para o novo mundo, limpa para usar os defaults
      // ou copia do virtual se for a primeira vez no Real? 
      // Melhor limpar para garantir separação, o hook useViability carregará defaults.
      localStorage.removeItem('tkx_simulation_params');
    }

    // Atualiza estado e força remontagem
    setWorldMode(nextMode);
    localStorage.setItem('tkx_world_mode', nextMode);
    setAppKey(prev => prev + 1);
  };

  return (
    <DashboardContent key={appKey} worldMode={worldMode} toggleWorld={toggleWorld} />
  );
};

export default App;