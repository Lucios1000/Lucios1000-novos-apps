import React, { useMemo, useState } from 'react';
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
  { key: 'fixedCosts', label: 'Custos Fixos (R$)', paramKey: 'fixedCosts', min: 0, max: 20000, step: 100 },
];

const MKT_SLIDERS: Array<{
  label: string;
  paramKey: keyof ReturnType<typeof useViability>['currentParams'];
  min: number;
  max: number;
  step: number;
}> = [
  { label: 'Marketing Mensal (R$)', paramKey: 'marketingMonthly', min: 0, max: 50000, step: 500 },
  { label: 'Adesão Turbo (R$)', paramKey: 'adesaoTurbo', min: 0, max: 10000, step: 100 },
  { label: 'Tráfego Pago (R$)', paramKey: 'trafegoPago', min: 0, max: 10000, step: 100 },
  { label: 'Parcerias Bares (R$)', paramKey: 'parceriasBares', min: 0, max: 10000, step: 100 },
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
  { label: 'Reserva Operacional (% GMV)', paramKey: 'reservaOperacionalGMV', min: 0, max: 5, step: 0.1, description: 'Cashbacks e gatilhos de milha' },
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
        className="px-4 py-2 rounded-xl text-xs font-black uppercase border-2 border-slate-600 text-slate-200 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
      >
        Resetar parâmetros
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
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={currentParams.applyMinimumCosts}
            onChange={(e) => updateCurrentParam('applyMinimumCosts', e.target.checked)}
            className="w-5 h-5 accent-yellow-500"
          />
          <div>
            <div className="text-sm font-bold text-white">Aplicar Custos Mínimos</div>
            <div className="text-xs text-slate-400">Custos fixos R$8k/mês (escalado) + Marketing base R$3k/mês. Desmarque para cenário zero-cost.</div>
          </div>
        </label>
      </div>
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
      { name: 'Marketing', value: currentParams.marketingMonthly },
      { name: 'Tech', value: currentParams.techMonthly },
      { name: 'Adesão Turbo', value: currentParams.adesaoTurbo },
      { name: 'Tráfego Pago', value: currentParams.trafegoPago },
      { name: 'Parcerias', value: currentParams.parceriasBares },
      { name: 'Indique/Ganhe', value: currentParams.indiqueGanhe },
    ];
    const colors = ['#0b1220', '#f59e0b', '#eab308', '#e5e7eb', '#ef4444', '#fbbf24'];
    return (
      <div className="space-y-6">
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase text-yellow-500">Sliders de Marketing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MKT_SLIDERS.map((s) => (
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
        </div>
        
        {/* TKX DYNAMIC CONTROL: Sliders de Fidelidade */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black uppercase text-orange-500">🎯 TKX Dynamic Control - Fidelidade</h3>
            <span className="text-[10px] text-slate-400 px-2 py-1 rounded-full bg-slate-800 border border-slate-700">Elite Drivers + Passageiros + Reserva Operacional</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FIDELITY_SLIDERS.map((s) => (
              <div key={s.paramKey} className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-black text-slate-400">
                  <span>{s.label}</span>
                  <span className="text-orange-400 text-sm">
                    {s.paramKey === 'reservaOperacionalGMV' ? `${(currentParams as any)[s.paramKey].toFixed(1)}%` : formatCurrency((currentParams as any)[s.paramKey])}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(currentParams as any)[s.paramKey]}
                  onChange={(e) => updateCurrentParam(s.paramKey as any, Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="text-[9px] text-slate-500">{s.description}</div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/30 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-orange-400 font-black mb-2">💡 Consolidação de Campanhas</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <span className="font-bold text-orange-300">Motoristas:</span> Take Rate Ponderado 13,2% (Meritocracia 15% a 10%). Premiação semestral para 20 melhores.
              </div>
              <div>
                <span className="font-bold text-orange-300">Passageiros:</span> Gatilhos de 500, 1.000 e 2.000 corridas (Cashback, Select e Experiência/Sorteio).
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">{" "}
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
    const rows = projections.slice(0, 12).map((r) => {
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
      <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">Projeções de Volume (36 meses)</h3>
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={projections}>
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
      ltv: p.ltv,
      cac: p.cac,
      ratio: p.cac > 0 ? p.ltv / p.cac : 0
    }));
    
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">KPIs de Viabilidade</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="card-gradient hover-lift bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[7px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-1">LTV (M36)</div>
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
            <div className="text-[9px] text-slate-400 mt-1">Unit Economics</div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[7px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-1">CAGR (Ano 1-2)</div>
            <div className="text-lg font-black text-blue-400">{(cagr * 100).toFixed(1)}%</div>
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
        <h3 className="text-sm font-black uppercase text-yellow-500">Comparativo Semestral (limpo)</h3>
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
    const totalGMV36 = results.reduce((acc, curr) => acc + curr.grossRevenue, 0);
    const totalProfit36 = results.reduce((acc, curr) => acc + curr.netProfit, 0);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black">GMV Total 36m</div>
            <div className="text-xl font-black text-white">{formatCurrency(totalGMV36)}</div>
          </div>
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
      <h3 className="text-xs font-black uppercase text-yellow-400 tracking-[0.08em]">DRE detalhado</h3>
      <div className="card-gradient border border-slate-700/40 rounded-xl overflow-hidden">
        <table className="w-full text-xs text-slate-200">
          <thead className="bg-gradient-to-r from-slate-800 to-slate-900 text-[7px] uppercase text-slate-400 font-bold">
            <tr>
              <th className="p-2 text-left">Mês</th>
              <th className="p-2 text-right">GMV</th>
              <th className="p-2 text-right">Take 15%</th>
              <th className="p-2 text-right">Cashback</th>
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
            {(filteredDreResults || []).slice(0, 12).map((row, idx) => (
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
                <td className="p-2 text-right text-orange-300"><CurrencyDisplay value={row.reservaOperacionalCost} /></td>
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
          <div><span className="font-semibold text-slate-200">Receita:</span> 13,2% do GMV (efetivo TKX)</div>
          <div><span className="font-semibold text-orange-400">Cashback:</span> Devolução ao motorista (1,8%)</div>
          <div><span className="font-semibold text-slate-200">Fixos:</span> R$8k escalado (+50%/semestre)</div>
          <div><span className="font-semibold text-slate-200">Marketing:</span> R$3k + R$1,5/novo usuário</div>
          <div><span className="font-semibold text-slate-200">Tech:</span> R$0,15/corrida + Bancário (2% GMV)</div>
          <div><span className="font-semibold text-orange-400">Elite Drivers:</span> Premiação semestral (M6, M12, M18...)</div>
          <div><span className="font-semibold text-orange-400">Fid. Passageiros:</span> Sorteio anual (M12, M24, M36)</div>
          <div><span className="font-semibold text-orange-400">Reserva Operacional:</span> % GMV mensal (cashbacks/gatilhos)</div>
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
        
        {/* Growth Phase & Seasonality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="card-gradient hover-lift bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-blue-400 font-bold tracking-[0.08em] mb-2">Fase de Crescimento</div>
            <div className="text-sm font-black text-blue-300">{getGrowthPhase(currentMonth)}</div>
            <div className="text-[9px] text-slate-400 mt-1">Mês {currentMonth} do ciclo</div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-purple-400 font-bold tracking-[0.08em] mb-2">Contexto Sazonal</div>
            <div className="text-sm font-black text-purple-300">{seasonalLabel}</div>
            <div className="text-[9px] text-slate-400 mt-1">Multiplicador: {currentSeasonality.toFixed(2)}x</div>
          </div>
        </div>
        
        {/* Capacity & Fleet Health */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card-gradient hover-lift bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-green-400 font-bold tracking-[0.08em] mb-2">Utilização de Capacidade (M12)</div>
            <div className={`text-sm font-black ${utilizationRate > 80 ? 'text-orange-400' : 'text-green-400'}`}>{utilizationRate.toFixed(1)}%</div>
            <div className="text-[9px] text-slate-400 mt-1">{actualRides.toFixed(0)} corridas / {maxCapacity.toFixed(0)} capacidade</div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-orange-400 font-bold tracking-[0.08em] mb-2">Status da Frota (M12)</div>
            <div className="text-sm font-black text-orange-300">{gapStatus}</div>
            <div className="text-[9px] text-slate-400 mt-1">Meta: {targetDrivers} | Atual: {m12?.drivers || 0}</div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-cyan-400 font-bold tracking-[0.08em] mb-2">Break-Even</div>
            <div className="text-sm font-black text-cyan-300">{breakEvenLabel}</div>
            <div className="text-[9px] text-slate-400 mt-1">Ponto de equilíbrio financeiro</div>
          </div>
        </div>
        
        {/* Year 1 vs Year 2 Trajectory */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Crescimento da Receita (12 meses)</div>
            <div className={`text-lg font-black ${revenueGrowth > 200 ? 'text-green-400' : revenueGrowth > 100 ? 'text-yellow-400' : 'text-slate-300'}`}>{revenueGrowth.toFixed(0)}%</div>
            <div className="text-[9px] text-slate-400 mt-1">De <CurrencyDisplay value={m1?.grossRevenue} /> para <CurrencyDisplay value={m12?.grossRevenue} /></div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Crescimento de Usuários (12 meses)</div>
            <div className={`text-lg font-black ${userGrowth > 200 ? 'text-green-400' : userGrowth > 100 ? 'text-yellow-400' : 'text-slate-300'}`}>{userGrowth.toFixed(0)}%</div>
            <div className="text-[9px] text-slate-400 mt-1">De {m1?.users.toFixed(0) || 0} para {m12?.users.toFixed(0) || 0}</div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Margem de Lucro (M12)</div>
            <div className={`text-lg font-black ${profitMargin > 10 ? 'text-green-400' : profitMargin > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{profitMargin.toFixed(1)}%</div>
            <div className="text-[9px] text-slate-400 mt-1">
              {profitLabel(m12?.netProfit)}: <CurrencyDisplay value={profitValue(m12?.netProfit)} colorClass={profitColor(m12?.netProfit)} />
            </div>
          </div>
        </div>
        
        {/* Projection to M36 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Projeção ao Final (Mês 36)</div>
            <div className="space-y-2 text-[9px]">
              <div><span className="text-slate-400">Usuários:</span> <span className="font-semibold text-white"><NumberDisplay value={m36?.users} /></span></div>
              <div><span className="text-slate-400">Frota:</span> <span className="font-semibold text-white"><NumberDisplay value={m36?.drivers} /></span></div>
              <div><span className="text-slate-400">Corridas/mês:</span> <span className="font-semibold text-white"><NumberDisplay value={m36?.rides} /></span></div>
              <div><span className="text-slate-400">Receita Bruta:</span> <span className="font-semibold text-green-400"><CurrencyDisplay value={m36?.grossRevenue} /></span></div>
            </div>
          </div>
          <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-lg">
            <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">Lucro / Prejuízo Acumulado (36 meses)</div>
            <div className={`text-lg font-black ${profitColor(m36?.cumulativeProfit)}`}>
              <CurrencyDisplay value={profitValue(m36?.cumulativeProfit)} colorClass={profitColor(m36?.cumulativeProfit)} />
            </div>
            <div className="text-[9px] text-slate-400 mt-2">Cenário: <span className="font-semibold">{SCENARIO_LABEL[scenario]}</span></div>
          </div>
        </div>
        
        {/* Operational Alerts */}
        <div className="card-gradient hover-lift bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-lg">
          <div className="text-[7px] uppercase text-slate-400 font-bold tracking-[0.08em] mb-2">📋 Alertas Operacionais</div>
          <div className="space-y-1">
            {alerts.map((alert, idx) => (
              <div key={idx} className="text-[9px] text-slate-300 font-semibold">{alert}</div>
            ))}
          </div>
        </div>
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
      >
        <div className="space-y-5 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-5 rounded-xl bg-gradient-to-br from-slate-900/70 to-slate-800/50 border border-slate-700/40 shadow-lg">
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent">TKX Franca Dashboard</h1>
              <p className="text-slate-400 text-xs mt-1 font-medium">Cenário: <span className="text-yellow-400 font-bold">{SCENARIO_LABEL[scenario]}</span></p>
          </div>
          {renderScenarioSelector()}
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

