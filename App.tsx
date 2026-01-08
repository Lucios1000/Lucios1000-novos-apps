import React, { useMemo, useState, useEffect } from 'react';
import Layout from './components/Layout';
import SnapshotModal from './components/SnapshotModal';
import ComparisonTab from './components/ComparisonTab';
import TrendAnalysisTab from './components/TrendAnalysisTab';
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
  { key: 'activeDrivers', label: 'Frota Inicial', paramKey: 'activeDrivers', min: 0, max: 500, step: 1, unit: ' condutores' },
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

const App: React.FC = () => {
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
    updateParam,
    resetParams,
    toggleMinCosts,
    supplyBottleneck,
    oversupplyWarning,
    paramsMap,
    calculateProjections,
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

  const currentMonth = projections[0];
  const lastMonth = projections[projections.length - 1];

  const summary = useMemo(() => {
    const gross = currentMonth?.grossRevenue ?? 0;
    const net = currentMonth?.netProfit ?? 0;
    const margin = currentMonth?.margin ?? 0;
    const drivers = currentMonth?.drivers ?? currentParams.activeDrivers;
    const users = currentMonth?.users ?? 0;
    return { gross, net, margin, drivers, users };
  }, [currentMonth, currentParams.activeDrivers]);

  const yearlyMetrics = useMemo(() => {
    const y1 = projections.slice(0, 12);
    const y2 = projections.slice(12, 24);
    const y3 = projections.slice(24, 36);
    const calcYear = (months: MonthlyResult[]) => ({
      revenue: months.reduce((a, m) => a + m.grossRevenue, 0),
      profit: months.reduce((a, m) => a + m.netProfit, 0),
      rides: months.reduce((a, m) => a + m.rides, 0),
      finalUsers: months[months.length - 1]?.users ?? 0,
      finalDrivers: months[months.length - 1]?.drivers ?? 0,
    });
    return { y1: calcYear(y1), y2: calcYear(y2), y3: calcYear(y3) };
  }, [projections]);

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
        updateParam(scenarioKey, key as any, params[key]);
      });
    });
    setScenario(snap.activeScenario);
    alert(`✅ Snapshot "${snap.name}" carregado!`);
    setIsSnapshotModalOpen(false);
  };

  // Função para exportar em Excel
  const handleExportExcel = async () => {
    try {
      console.log('Iniciando exportação Excel...', { projectionsLength: projections.length });
      const XLSX = await import('xlsx');
      
      const wb = XLSX.utils.book_new();
      
      // Aba 1: DRE Detalhado
      const dreData = projections.map((r, idx) => ({
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
      const driversData = projections.map((r) => ({
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
        const baseMonthlyRides = projections[0]?.rides || 0;
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
      }, {
        label: profitLabel(summary.net, 'Lucro Líquido (Mês 1)', 'Prejuízo (Mês 1)'),
        value: summary.net,
        isProfit: true,
        accent: profitColor(summary.net, 'text-gradient-green', 'text-gradient-red'),
        bg: summary.net >= 0 ? 'from-green-500/10 to-emerald-500/5' : 'from-red-500/10 to-rose-500/5',
      }, {
        label: 'Margem (Mês 1)',
        value: summary.margin,
        isPercent: true,
        accent: summary.margin >= 0 ? 'text-gradient-green' : 'text-gradient-red',
        bg: summary.margin >= 0 ? 'from-green-500/10 to-emerald-500/5' : 'from-red-500/10 to-rose-500/5',
      }, {
        label: 'Frota / Usuários',
        value: [summary.drivers, summary.users],
        isArray: true,
        accent: 'text-white',
        bg: 'from-blue-500/10 to-indigo-500/5',
      }].map((card) => (
        <div key={card.label} className={`card-gradient hover-lift bg-gradient-to-br ${card.bg} border border-slate-700/50 p-4 rounded-xl shadow-lg`}>
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
      { name: 'Tech', value: currentParams.techMonthly || 0 },
      { name: 'Adesão Turbo', value: currentParams.adesaoTurbo || 0 },
      { name: 'Tráfego Pago', value: currentParams.trafegoPago || 0 },
      { name: 'Parcerias', value: currentParams.parceriasBares || 0 },
      { name: 'Indique/Ganhe', value: currentParams.indiqueGanhe || 0 },
    ];
    const colors = ['#0b1220', '#f59e0b', '#eab308', '#e5e7eb', '#ef4444', '#fbbf24'];
    return (
      <div className="space-y-6">
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
            const primaryKeys = new Set<string>(['fixedCosts','marketingMonthly']);
            const primary = (MKT_SLIDERS || []).filter(s => primaryKeys.has(String(s.paramKey)));
            const rest = (MKT_SLIDERS || []).filter(s => !primaryKeys.has(String(s.paramKey)));
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {primary.map((s) => (
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
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black mb-2">Custos Mensais</div>
            <div className="grid grid-cols-2 gap-4 text-slate-200">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Fixos</div>
                <div className="text-xl font-black">{formatCurrency(currentParams.fixedCosts)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tecnologia</div>
                <div className="text-xl font-black">{formatCurrency(currentParams.techMonthly)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Marketing</div>
                <div className="text-xl font-black">{formatCurrency(currentParams.marketingMonthly)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Campanhas</div>
                <div className="text-xl font-black">{formatCurrency(currentParams.adesaoTurbo + currentParams.trafegoPago + currentParams.parceriasBares + currentParams.indiqueGanhe)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFestasEventos = () => {
    const validDates = eventStartStr && eventEndStr && new Date(eventEndStr) >= new Date(eventStartStr);
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = validDates ? (Math.floor((new Date(eventEndStr).getTime() - new Date(eventStartStr).getTime()) / msPerDay) + 1) : 0;
    const baseMonthlyRides = projections[0]?.rides || 0;
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
      { name: 'Centro / Estação', status: 'Crítico', peak: '12h-14h / 18h-19h', load: 95 },
      { name: 'Leporace / Brasilândia', status: 'Alto', peak: '06h-08h / 17h-19h', load: 82 },
      { name: 'City Petrópolis / Aeroporto', status: 'Médio', peak: '07h-09h / Finais de Semana', load: 68 },
      { name: 'Distrito Industrial', status: 'Focal', peak: '05h-06h / 14h-15h / 22h-23h', load: 55 },
    ];
    const statusColor: Record<string, string> = {
      Crítico: '#ef4444',
      Alto: '#f59e0b',
      Médio: '#eab308',
      Focal: '#fbbf24',
    };
    const ticketBench = [
      { name: 'Uber', value: 20 },
      { name: '99', value: 18 },
      { name: 'Maxim', value: 14.8 },
      { name: 'Garupa', value: 21 },
      { name: 'Urban 66', value: 17.5 },
      { name: 'TKX Franca', value: 18.5 },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-black">Zonas de Calor e Demanda Franca-SP</div>
              <div className="text-xs text-slate-500">Taxa de embarque por cluster horário</div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
              {Object.entries(statusColor).map(([label, color]) => (
                <span key={label} className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700/60">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatZones} layout="vertical" margin={{ left: 60 }}>
                  <defs>
                    <linearGradient id="gradHeatCritico" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7f1d1d" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="gradHeatAlto" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#c2410c" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="gradHeatMedio" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a16207" />
                      <stop offset="100%" stopColor="#eab308" />
                    </linearGradient>
                    <linearGradient id="gradHeatFocal" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ca8a04" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} stroke="#475569" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="#475569" width={140} fontSize={11} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'transparent', stroke: 'transparent' }} />
                  <Bar dataKey="load" radius={[0, 8, 8, 0]}>
                    {heatZones.map((z, idx) => (
                      <Cell key={z.name} fill={`url(#${
                        z.status === 'Crítico' ? 'gradHeatCritico' :
                        z.status === 'Alto' ? 'gradHeatAlto' :
                        z.status === 'Médio' ? 'gradHeatMedio' :
                        'gradHeatFocal'
                      })`} stroke="#0b1220" strokeWidth={2.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {heatZones.map((z) => (
                <div key={z.name} className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] uppercase text-slate-300 font-bold">{z.name}</div>
                      <div className="text-[11px] text-slate-400">Pico: {z.peak}</div>
                    </div>
                    <span className="text-[11px] font-black px-2 py-1 rounded-full" style={{ backgroundColor: `${statusColor[z.status]}22`, color: statusColor[z.status] }}>{z.status}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Taxa de embarque</span>
                    <span className="text-sm font-black" style={{ color: statusColor[z.status] }}>{z.load}%</span>
                  </div>
                  <div className="mt-1 w-full h-2 bg-slate-900/70 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full" style={{ width: `${z.load}%`, backgroundColor: statusColor[z.status] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="text-[10px] uppercase text-slate-400 font-black mb-3">Benchmarks Tickets Locais</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ticketBench.map((t) => (
              <div key={t.name} className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-lg flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-200">{t.name}</div>
                <div className="text-lg font-black text-yellow-300">{formatCurrency(t.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDrivers = () => {
    const MPD = 10.1; // Média de Produtividade Diária
    const startMonth = (yearPeriod - 1) * 12;
    const endMonth = yearPeriod * 12;
    const rows = projections.slice(startMonth, endMonth).map((r) => {
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

    const bottleneckMonths = rows.filter(r => r.isBottleneck).length;
    const avgUtilization = rows.reduce((a, r) => a + r.utilizacao, 0) / rows.length;
    const maxGap = Math.max(...rows.map(r => r.demandGap));

    return (
      <div className="space-y-3">
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
              {rows.map((r, idx) => (
                <tr key={r.month} className={`${idx % 2 === 0 ? 'bg-slate-900/30' : ''} ${r.isBottleneck ? 'bg-red-900/10' : ''}`}>
                  <td className="p-2 font-bold text-slate-100">M{r.month}</td>
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
              ))}
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
          <ComposedChart data={projections.slice((yearPeriod - 1) * 12, yearPeriod * 12)}>
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
    const last = projections[projections.length - 1];
    const first = projections[0];
    const ratio = (last?.ltv || 0) / ((last?.cac || 1));
    const cagr = Math.pow(projections[11].grossRevenue / (first?.grossRevenue || 1), 1/2) - 1;
    
    // Dados para gráfico de evolução LTV/CAC
    const ltvCacData = projections.map(p => ({
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
    const scenarioProjections: Record<ScenarioType, MonthlyResult[]> = {
      [ScenarioType.REALISTA]: calculateProjections(paramsMap[ScenarioType.REALISTA], ScenarioType.REALISTA),
      [ScenarioType.PESSIMISTA]: calculateProjections(paramsMap[ScenarioType.PESSIMISTA], ScenarioType.PESSIMISTA),
      [ScenarioType.OTIMISTA]: calculateProjections(paramsMap[ScenarioType.OTIMISTA], ScenarioType.OTIMISTA),
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
    const results = projections;
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
            {(filteredDreResults || []).slice((yearPeriod - 1) * 12, yearPeriod * 12).map((row, idx) => (
              <tr key={row.month} className={idx % 2 === 0 ? 'bg-slate-900/30' : ''}>
                <td className="p-2 font-bold text-slate-100">M{row.month}</td>
                <td className="p-2 text-right text-slate-300"><CurrencyDisplay value={row.grossRevenue} /></td>
                <td className="p-2 text-right text-slate-300"><CurrencyDisplay value={row.takeRateGross} /></td>
                <td className="p-2 text-right text-orange-400"><CurrencyDisplay value={row.cashback} /></td>
                <td className="p-2 text-right font-semibold text-green-400"><CurrencyDisplay value={row.takeRateRevenue} /></td>
                <td className="p-2 text-right text-red-300"><CurrencyDisplay value={row.taxes} /></td>
                <td className="p-2 text-right text-red-300"><CurrencyDisplay value={row.fixedCosts} /></td>
                <td className="p-2 text-right text-red-300"><CurrencyDisplay value={row.marketing} /></td>
                <td className="p-2 text-right text-red-300"><CurrencyDisplay value={row.tech} /></td>
                <td className="p-2 text-right text-red-300"><CurrencyDisplay value={row.variableCosts} /></td>
                <td className="p-2 text-right text-orange-300"><CurrencyDisplay value={row.eliteDriversCost} /></td>
                <td className="p-2 text-right text-orange-300"><CurrencyDisplay value={row.fidelidadePassageirosCost} /></td>
                <td className="p-2 text-right text-orange-300">
                  {row.reservaOperacionalCost > 0 ? <CurrencyDisplay value={row.reservaOperacionalCost} /> : <span className="text-slate-600">—</span>}
                </td>
                <td className={`p-2 text-right font-bold ${profitColor(row.netProfit)}`}>
                  <CurrencyDisplay value={profitValue(row.netProfit)} colorClass={profitColor(row.netProfit)} />
                </td>
                <td className={`p-2 text-right ${row.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}><PercentDisplay value={row.margin} /></td>
              </tr>
            ))}
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
              {formatCurrency(projections.reduce((sum, m) => sum + m.reservaOperacionalCost, 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Total Fidelidade</div>
            <div className="text-3xl font-black text-orange-400">
              {formatCurrency(
                (currentParams.eliteDriversSemestral * 6) + 
                (currentParams.fidelidadePassageirosAnual * 3) + 
                projections.reduce((sum, m) => sum + m.reservaOperacionalCost, 0)
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
    if (projections.length === 0) return null;
    
    const currentMonth = Math.min(12, projections.length);
    const m1 = projections[0];
    const m12 = projections[11];
    const m36 = projections[35];

    // Quebra por período (anos 1, 2, 3 e total)
    const periodSlices = [
      { key: 'y1', label: 'Ano 1', data: projections.slice(0, 12) },
      { key: 'y2', label: 'Ano 2', data: projections.slice(12, 24) },
      { key: 'y3', label: 'Ano 3', data: projections.slice(24, 36) },
      { key: 'total', label: '36m', data: projections }
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
    for (let i = 0; i < projections.length; i++) {
      if (projections[i].netProfit > 0) {
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
            { label: 'Ano 1', data: projections.slice(0, 12) },
            { label: 'Ano 2', data: projections.slice(12, 24) },
            { label: 'Ano 3', data: projections.slice(24, 36) },
            { label: 'Total', data: projections }
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
            { label: 'Ano 1', data: projections.slice(0, 12) },
            { label: 'Ano 2', data: projections.slice(12, 24) },
            { label: 'Ano 3', data: projections.slice(24, 36) },
            { label: 'Total', data: projections }
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
            { label: 'Ano 1', data: projections.slice(0, 12) },
            { label: 'Ano 2', data: projections.slice(12, 24) },
            { label: 'Ano 3', data: projections.slice(24, 36) },
            { label: 'Total', data: projections }
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
        return <ComparisonTab snapshots={snapshots} calculateProjections={calculateProjections} />;
      case 14:
        return <TrendAnalysisTab snapshots={snapshots} calculateProjections={calculateProjections} />;
      case 15:
        return renderFestasEventos();
        return (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-slate-200">
            <p className="text-sm font-medium">Conteúdo desta aba ainda não foi reescrito. Use as abas de visão geral para acompanhar os números principais.</p>
          </div>
        );
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      >
        <div className="space-y-5 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-5 rounded-xl bg-gradient-to-br from-slate-900/70 to-slate-800/50 border border-slate-700/40 shadow-lg">
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent">TKX Franca Dashboard</h1>
              <p className="text-slate-400 text-xs mt-1 font-medium">Cenário: <span className="text-yellow-400 font-bold">{SCENARIO_LABEL[scenario]}</span></p>
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
                <div className="text-lg font-black text-gradient-gold"><CurrencyDisplay value={projections.reduce((acc, r) => acc + r.grossRevenue, 0)} /></div>
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
};

export default App;

