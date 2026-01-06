import React, { useMemo } from 'react';
import Layout from './components/Layout';
import { useViability } from './hooks/useViability';
import { ScenarioType, MonthlyResult } from './types';
import { FRANCA_STATS } from './constants';

const formatCurrency = (value?: number) =>
  typeof value === 'number'
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : '—';

const formatNumber = (value?: number) =>
  typeof value === 'number' ? value.toLocaleString('pt-BR') : '—';

const formatPercent = (value?: number, digits = 1) =>
  typeof value === 'number' ? `${value.toFixed(digits)}%` : '—';

const SCENARIO_LABEL: Record<ScenarioType, string> = {
  [ScenarioType.REALISTA]: 'Realista',
  [ScenarioType.PESSIMISTA]: 'Pessimista',
  [ScenarioType.OTIMISTA]: 'Otimista',
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
  { key: 'activeDrivers', label: 'Frota Inicial', paramKey: 'activeDrivers', min: 0, max: 500, step: 1, unit: ' condutores' },
  { key: 'driverAdditionMonthly', label: 'Adição Mensal de Frota', paramKey: 'driverAdditionMonthly', min: 0, max: 100, step: 1, unit: ' condutores' },
  { key: 'avgFare', label: 'Tarifa Média (R$)', paramKey: 'avgFare', min: 10, max: 50, step: 0.5 },
  { key: 'ridesPerUserMonth', label: 'Corridas por Usuário/mês', paramKey: 'ridesPerUserMonth', min: 1, max: 10, step: 0.1 },
  { key: 'userGrowth', label: 'Crescimento de Usuários (%)', paramKey: 'userGrowth', min: 0, max: 30, step: 1, unit: '%' },
  { key: 'fixedCosts', label: 'Custos Fixos (R$)', paramKey: 'fixedCosts', min: 0, max: 20000, step: 100 },
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
    resetParams,
    supplyBottleneck,
    oversupplyWarning,
  } = useViability();

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

  const renderScenarioSelector = () => (
    <div className="flex flex-wrap gap-2">
      {Object.values(ScenarioType).map((sc) => (
        <button
          key={sc}
          type="button"
          onClick={() => setScenario(sc)}
          className={`px-3 py-1 rounded-md text-xs font-black uppercase border transition-colors ${
            scenario === sc ? 'bg-yellow-500 text-slate-950 border-yellow-400' : 'border-slate-700 text-slate-200'
          }`}
        >
          {SCENARIO_LABEL[sc]}
        </button>
      ))}
      <button
        type="button"
        onClick={resetParams}
        className="px-3 py-1 rounded-md text-xs font-black uppercase border border-slate-700 text-slate-200 hover:text-white"
      >
        Resetar parâmetros
      </button>
    </div>
  );

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[{
        label: 'Receita Bruta (Mês 1)',
        value: formatCurrency(summary.gross),
        accent: 'text-yellow-400',
      }, {
        label: 'Lucro Líquido (Mês 1)',
        value: formatCurrency(summary.net),
        accent: summary.net >= 0 ? 'text-green-400' : 'text-red-400',
      }, {
        label: 'Margem (Mês 1)',
        value: formatPercent(summary.margin),
        accent: summary.margin >= 0 ? 'text-green-400' : 'text-red-400',
      }, {
        label: 'Frota / Usuários',
        value: `${formatNumber(summary.drivers)} / ${formatNumber(summary.users)}`,
        accent: 'text-white',
      }].map((card) => (
        <div key={card.label} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="text-[10px] uppercase text-slate-400 font-black tracking-widest">{card.label}</div>
          <div className={`text-2xl font-black mt-2 ${card.accent}`}>{card.value}</div>
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

  const renderDre = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase text-yellow-500">DRE resumido (mensal)</h3>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-slate-200">
          <thead className="bg-slate-800 text-[11px] uppercase text-slate-400">
            <tr>
              <th className="p-3 text-left">Mês</th>
              <th className="p-3 text-right">Receita</th>
              <th className="p-3 text-right">Lucro Líquido</th>
              <th className="p-3 text-right">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(filteredDreResults || []).slice(0, 12).map((row) => (
              <tr key={row.month}>
                <td className="p-3 font-bold">Mês {row.month}</td>
                <td className="p-3 text-right">{formatCurrency(row.grossRevenue)}</td>
                <td className={`p-3 text-right ${row.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(row.netProfit)}</td>
                <td className={`p-3 text-right ${row.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(row.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAudits = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase text-yellow-500">Resumo anual</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {audits.map((audit) => (
          <div key={audit.year} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[10px] uppercase text-slate-400 font-black">Ano {audit.year}</div>
            <div className="text-lg font-black text-white mt-1">GMV: {formatCurrency(audit.totalGMV)}</div>
            <div className="text-sm text-slate-300">Receita: {formatCurrency(audit.totalRevenue)}</div>
            <div className="text-sm text-slate-300">Lucro Líquido: {formatCurrency(audit.totalNetProfit)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase text-yellow-500">Mercado (Franca)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase text-slate-400 font-black">População</div>
          <div className="text-2xl font-black text-white">{formatNumber(FRANCA_STATS.population)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase text-slate-400 font-black">Usuários Digitais (SAM)</div>
          <div className="text-2xl font-black text-white">{formatNumber(FRANCA_STATS.digitalUsers)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase text-slate-400 font-black">Meta de Market Share</div>
          <div className="text-2xl font-black text-yellow-400">{formatPercent(FRANCA_STATS.marketShareTarget)}</div>
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
            {renderMarket()}
          </div>
        );
      case 3:
        return renderParams();
      case 7:
        return renderDre();
      case 10:
        return (
          <div className="space-y-6">
            {renderSummaryCards()}
            {renderAudits()}
          </div>
        );
      default:
        return (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-slate-200">
            <p className="text-sm font-medium">Conteúdo desta aba ainda não foi reescrito. Use as abas de visão geral para acompanhar os números principais.</p>
          </div>
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="space-y-6 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black">TKX Franca — Dashboard</h1>
            <p className="text-slate-400 text-sm">Cenário atual: {SCENARIO_LABEL[scenario]}</p>
          </div>
          {renderScenarioSelector()}
        </div>

        {(supplyBottleneck || oversupplyWarning) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supplyBottleneck && (
              <div className="bg-red-600/20 border border-red-500/40 text-red-100 px-4 py-3 rounded-lg text-sm font-bold">
                Gargalo de atendimento detectado — aumente frota ou reduza CAC para melhorar cobertura.
              </div>
            )}
            {oversupplyWarning && (
              <div className="bg-orange-600/20 border border-orange-500/40 text-orange-100 px-4 py-3 rounded-lg text-sm font-bold">
                Excesso de oferta de motoristas — ajuste crescimento ou acelere aquisição de usuários.
              </div>
            )}
          </div>
        )}

        {renderTab()}

        {lastMonth && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-200 text-sm">
            <div className="font-black uppercase text-[10px] text-slate-400">Visão 36 meses (resumo)</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <div className="text-[11px] text-slate-400">Frota final</div>
                <div className="text-lg font-black">{formatNumber(lastMonth.drivers)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Usuários finais</div>
                <div className="text-lg font-black">{formatNumber(lastMonth.users)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Receita total</div>
                <div className="text-lg font-black">{formatCurrency(projections.reduce((acc, r) => acc + r.grossRevenue, 0))}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Lucro acumulado</div>
                <div className={`text-lg font-black ${lastMonth.accumulatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(lastMonth.accumulatedProfit)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;

