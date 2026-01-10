import React, { useState, useEffect, useMemo } from 'react';
import { SimulationParams } from '../types';
import { 
  DollarSign, Car, TrendingUp, MapPin, Users, Target, 
  Calculator, AlertTriangle, CheckCircle2, Building2,
  ShieldCheck, Save, FolderOpen, Trash2, RefreshCw, Clock, Info, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area
} from 'recharts';

interface InitialPlanningTabProps {
  currentParams: SimulationParams;
  updateCurrentParam: (key: keyof SimulationParams, value: number) => void;
}

// Dados de demonstração para preenchimento automático de parâmetros técnicos
const DEMO_DATA: Record<string, { population: number, avgDist: number, avgTime: number }> = {
  'Franca': { population: 358539, avgDist: 5.2, avgTime: 12 },
  'Ribeirão Preto': { population: 711825, avgDist: 6.8, avgTime: 15 },
  'São Paulo': { population: 11451245, avgDist: 8.5, avgTime: 25 },
};

const COMPETITORS = [
  { name: 'Uber', baseFare: 4.00, pricePerKm: 2.20, pricePerMin: 0.35 },
  { name: '99', baseFare: 3.80, pricePerKm: 2.00, pricePerMin: 0.30 },
  { name: 'Maxim', baseFare: 3.00, pricePerKm: 1.90, pricePerMin: 0.25 },
  { name: 'Garupa', baseFare: 4.50, pricePerKm: 2.40, pricePerMin: 0.40 },
  { name: 'Urban 66', baseFare: 3.50, pricePerKm: 2.10, pricePerMin: 0.30 },
];

const PRESETS_KEY = 'tkx_planning_presets';

// Função pura exportada para testes unitários
export const calculateTechnicalTicket = (
  baseFare: number,
  costPerKm: number,
  avgDistance: number,
  costPerMin: number,
  avgTime: number,
  minFare: number,
  dynamicFactor: number
) => {
  const rawTechnicalCost = baseFare + (costPerKm * avgDistance) + (costPerMin * avgTime);
  return Math.max(minFare, rawTechnicalCost) * dynamicFactor;
};

export const InitialPlanningTab: React.FC<InitialPlanningTabProps> = ({ currentParams, updateCurrentParam }) => {
  // --- Estado Local para Inputs Estratégicos ---
  const [ufs, setUfs] = useState<{ id: number; sigla: string; nome: string }[]>([]);
  const [cities, setCities] = useState<{ id: number; nome: string }[]>([]);
  const [selectedUf, setSelectedUf] = useState('SP');
  const [selectedCity, setSelectedCity] = useState('Franca');
  const [population, setPopulation] = useState(358539);
  const [popGrowthRate, setPopGrowthRate] = useState(1.2); // Taxa de crescimento anual (%)
  const [isLoadingPop, setIsLoadingPop] = useState(false);
  
  const [samPercent, setSamPercent] = useState(55); // 40-60% sugestão
  const [shareTarget, setShareTarget] = useState(15); // Market Share Alvo
  
  // Configuração Técnica
  const [tariffSchedules, setTariffSchedules] = useState([
    { id: 'dawn', label: 'Madrugada (00h-06h)', start: 0, end: 6, dynamic: 1.4, basePrice: 2.00 },
    { id: 'morning', label: 'Manhã (06h-11h)', start: 6, end: 11, dynamic: 1.0, basePrice: 2.00 },
    { id: 'afternoon', label: 'Tarde (11h-17h)', start: 11, end: 17, dynamic: 0.9, basePrice: 2.00 },
    { id: 'evening', label: 'Vespertina (17h-20h)', start: 17, end: 20, dynamic: 1.1, basePrice: 2.00 },
    { id: 'night', label: 'Noite (20h-00h)', start: 20, end: 24, dynamic: 1.3, basePrice: 2.00 },
  ]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('morning');

  const currentSchedule = tariffSchedules.find(s => s.id === selectedScheduleId) || tariffSchedules[1];
  const baseFare = currentSchedule.basePrice;
  const dynamicFactor = currentSchedule.dynamic;

  const setBaseFare = (val: number) => {
    if (val < 0) return;
    setTariffSchedules(prev => prev.map(s => s.id === selectedScheduleId ? { ...s, basePrice: val } : s));
  };

  const setDynamicFactor = (val: number) => {
    if (val < 0.5) return;
    setTariffSchedules(prev => prev.map(s => s.id === selectedScheduleId?{ ...s, dynamic: val } : s));
  };
  
  const [costPerKm, setCostPerKm] = useState(2.00);
  const [costPerMin, setCostPerMin] = useState(0.30);
  const [minFare, setMinFare] = useState(5.00);
  const [avgDistance, setAvgDistance] = useState(DEMO_DATA['Franca'].avgDist);
  const [avgTime, setAvgTime] = useState(DEMO_DATA['Franca'].avgTime);
  
  // Custos Unitários Fixos (DRE Unitário)
  const [gatewayFeePct, setGatewayFeePct] = useState(2.5);
  const [insuranceFixed, setInsuranceFixed] = useState(0.60);
  const [techFeeFixed, setTechFeeFixed] = useState(0.40);
  const [legalProvision, setLegalProvision] = useState(0.35);
  const [trafficContingencyPct, setTrafficContingencyPct] = useState(1.5);

  // --- Gerenciamento de Presets ---
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Carregar Estados do IBGE
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setUfs(data))
      .catch(err => console.error('Erro ao carregar estados:', err));
  }, []);

  // Carregar Cidades quando UF muda
  useEffect(() => {
    if (selectedUf) {
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`)
        .then(res => res.json())
        .then(data => {
          setCities(data);
          if (!data.find((c: any) => c.nome === selectedCity)) {
            setSelectedCity(data[0]?.nome || '');
          }
        })
        .catch(err => console.error('Erro ao carregar cidades:', err));
    }
  }, [selectedUf]);

  // Atualizar dados de demonstração
  useEffect(() => {
    const demo = DEMO_DATA[selectedCity];
    if (demo) {
      setPopulation(demo.population);
      setAvgDistance(demo.avgDist);
      setAvgTime(demo.avgTime);
    }
  }, [selectedCity]);

  // Buscar população via API IBGE
  const fetchPopulationData = async () => {
    const city = cities.find(c => c.nome === selectedCity);
    if (!city) return;
    setIsLoadingPop(true);
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/29171/resultados/${city.id}`);
      const data = await response.json();
      if (data && data.length > 0 && data[0].res && data[0].res.length > 0) {
         const results = data[0].res[0].res;
         const years = Object.keys(results);
         const lastYear = years[years.length - 1];
         const pop = parseInt(results[lastYear]);
         if (!isNaN(pop)) setPopulation(pop);
         else alert('Dados de população não disponíveis para esta cidade.');
      } else {
        alert('Não foi possível obter a população automaticamente.');
      }
    } catch (error) {
      console.error("Failed to fetch population", error);
      alert("Erro ao conectar com API do IBGE.");
    } finally {
      setIsLoadingPop(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(PRESETS_KEY);
    if (saved) {
      try { setPresets(JSON.parse(saved)); } catch {}
    }
  }, []);

  const savePreset = () => {
    const name = prompt('Nome do Preset (ex: Cenário Agressivo Franca):');
    if (!name?.trim()) return;

    const newPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      date: Date.now(),
      data: {
        selectedCity, selectedUf, population, popGrowthRate, samPercent, shareTarget, tariffSchedules,
        costPerKm, costPerMin, minFare, avgDistance, avgTime,
        gatewayFeePct, insuranceFixed, techFeeFixed, legalProvision, trafficContingencyPct,
        avgFare: currentParams.avgFare
      }
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    setSelectedPresetId(newPreset.id);
  };

  const loadPreset = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;

    const d = preset.data;
    setSelectedUf(d.selectedUf || 'SP');
    setSelectedCity(d.selectedCity || 'Franca');
    setPopulation(d.population || 358539);
    setPopGrowthRate(d.popGrowthRate || 1.2);
    setSamPercent(d.samPercent || 55);
    setShareTarget(d.shareTarget || 15);
    
    if (d.tariffSchedules) {
      setTariffSchedules(d.tariffSchedules);
    } else if (d.baseFare) {
      setTariffSchedules(prev => prev.map(s => ({ ...s, basePrice: d.baseFare, dynamic: d.dynamicFactor || 1.0 })));
    }

    setCostPerKm(d.costPerKm || 2.00);
    setCostPerMin(d.costPerMin || 0.30);
    setMinFare(d.minFare || 5.00);
    setAvgDistance(d.avgDistance || 5.2);
    setAvgTime(d.avgTime || 12);
    setGatewayFeePct(d.gatewayFeePct || 2.5);
    setInsuranceFixed(d.insuranceFixed || 0.60);
    setTechFeeFixed(d.techFeeFixed || 0.40);
    setLegalProvision(d.legalProvision || 0.35);
    setTrafficContingencyPct(d.trafficContingencyPct || 1.5);
    
    if (d.avgFare) updateCurrentParam('avgFare', d.avgFare);
    setSelectedPresetId(id);
  };

  const deletePreset = () => {
    if (!selectedPresetId || !confirm('Tem certeza que deseja excluir este preset?')) return;
    const updated = presets.filter(p => p.id !== selectedPresetId);
    setPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    setSelectedPresetId('');
  };

  const resetTariffs = () => {
    setTariffSchedules([
      { id: 'dawn', label: 'Madrugada (00h-06h)', start: 0, end: 6, dynamic: 1.4, basePrice: 2.00 },
      { id: 'morning', label: 'Manhã (06h-11h)', start: 6, end: 11, dynamic: 1.0, basePrice: 2.00 },
      { id: 'afternoon', label: 'Tarde (11h-17h)', start: 11, end: 17, dynamic: 0.9, basePrice: 2.00 },
      { id: 'evening', label: 'Vespertina (17h-20h)', start: 17, end: 20, dynamic: 1.1, basePrice: 2.00 },
      { id: 'night', label: 'Noite (20h-00h)', start: 20, end: 24, dynamic: 1.3, basePrice: 2.00 },
    ]);
    setCostPerKm(2.00);
    setCostPerMin(0.30);
    setMinFare(11.50);
  };

  const exportCompetitorsCSV = () => {
    const headers = ['Player', 'Tarifa Estimada', 'Diferenca %'];
    const rows = COMPETITORS.map(c => {
      let estValue = 0;
      if (avgDistance <= 2) {
        estValue = 12.90;
      } else {
        const raw = c.baseFare + (c.pricePerKm * avgDistance) + (c.pricePerMin * avgTime);
        estValue = Math.max(12.90, raw);
      }
      const diff = practicedTicket > 0 ? ((estValue - practicedTicket) / practicedTicket) * 100 : 0;
      return [
        c.name, 
        estValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
        `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
      ];
    });
    
    rows.push(['TKX Franca', practicedTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Ref.']);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `competidores_tkx_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Cálculos ---
  const tam = population;
  const sam = Math.round(tam * (samPercent / 100));
  const som = Math.round(sam * (shareTarget / 100));

  const technicalTicket = calculateTechnicalTicket(baseFare, costPerKm, avgDistance, costPerMin, avgTime, minFare, dynamicFactor);
  const practicedTicket = currentParams.avgFare;
  const priceDelta = practicedTicket - technicalTicket;
  const isUnderPriced = priceDelta < 0;

  // Unit Economics
  const gmv = practicedTicket;
  const gatewayCost = gmv * (gatewayFeePct / 100);
  const takeRateGross = gmv * 0.15;
  const trafficReserve = takeRateGross * (trafficContingencyPct / 100);
  const operationalMargin = gmv - gatewayCost - insuranceFixed - techFeeFixed - legalProvision;
  const driverEarnings = operationalMargin - takeRateGross; 

  const comparisonData = [
    { name: 'Custo Técnico', value: technicalTicket, fill: '#94a3b8' },
    { name: 'TKX (Praticado)', value: practicedTicket, fill: isUnderPriced ? '#ef4444' : '#22c55e' },
    ...COMPETITORS.map(c => {
      // Lógica de precificação dinâmica da concorrência
      // Trava: até 2km = R$ 12,90. Acima disso, fórmula padrão (respeitando mínimo de 12,90)
      let estimatedValue = 0;
      if (avgDistance <= 2) {
        estimatedValue = 12.90;
      } else {
        const raw = c.baseFare + (c.pricePerKm * avgDistance) + (c.pricePerMin * avgTime);
        estimatedValue = Math.max(12.90, raw);
      }
      return { name: c.name, value: estimatedValue, fill: '#f59e0b' };
    })
  ];

  // Dados para o gráfico de variação horária
  const hourlyData = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => {
      const s = tariffSchedules.find(ts => h >= ts.start && h < ts.end) || tariffSchedules[0];
      const cost = (s.basePrice + (costPerKm * avgDistance) + (costPerMin * avgTime)) * s.dynamic;
      return { hour: h, price: cost, label: s.label };
    });
  }, [tariffSchedules, costPerKm, avgDistance, costPerMin, avgTime]);

  // Cálculo do Custo Técnico Médio
  const avgTechnicalCost = useMemo(() => {
    if (!hourlyData.length) return 0;
    const total = hourlyData.reduce((acc, curr) => acc + curr.price, 0);
    return total / hourlyData.length;
  }, [hourlyData]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNumber = (val: number) => val.toLocaleString('pt-BR');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* BARRA DE PRESETS */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 sm:flex-none">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Carregar Preset</label>
            <select 
              value={selectedPresetId}
              onChange={(e) => loadPreset(e.target.value)}
              className="w-full sm:w-64 bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
            >
              <option value="">Selecione um cenário salvo...</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({new Date(p.date).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={savePreset}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Save className="w-4 h-4" /> Salvar Atual
          </button>
          {selectedPresetId && (
            <button 
              onClick={deletePreset}
              className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 rounded-lg transition-colors"
              title="Excluir preset selecionado"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: INTELIGÊNCIA DE MERCADO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Inputs de Mercado (TAM / SAM / SOM)</h3>
            <p className="text-xs text-slate-400">Definição do potencial de mercado baseada em dados demográficos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Localização (IBGE)</label>
            <div className="flex gap-2">
              <select 
                value={selectedUf} 
                onChange={(e) => setSelectedUf(e.target.value)}
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {ufs.map(uf => <option key={uf.id} value={uf.sigla}>{uf.sigla}</option>)}
              </select>
              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {cities.map(city => <option key={city.id} value={city.nome}>{city.nome}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" /> População:
              </div>
              <div className="flex-1 flex gap-1">
                <input 
                  type="number" 
                  value={population}
                  onChange={(e) => setPopulation(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 w-full"
                />
                <button 
                  onClick={fetchPopulationData}
                  disabled={isLoadingPop}
                  className="p-1 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition-colors"
                  title="Buscar população atualizada no IBGE"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingPop ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-[10px] text-slate-500">Cresc. Anual (%):</div>
              <input 
                type="number" 
                step="0.1"
                value={popGrowthRate}
                onChange={(e) => setPopGrowthRate(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 w-16"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">SAM (% Usuários App)</label>
            <div className="flex items-center gap-3">
              <input 
                type="range" min={20} max={80} step={1} 
                value={samPercent} onChange={(e) => setSamPercent(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-sm font-mono font-bold text-blue-400 w-12">{samPercent}%</span>
            </div>
            <div className="text-[10px] text-slate-500">Público endereçável: {formatNumber(sam)}</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Market Share Alvo</label>
            <div className="flex items-center gap-3">
              <input 
                type="range" min={1} max={50} step={0.5} 
                value={shareTarget} onChange={(e) => setShareTarget(Number(e.target.value))}
                className="flex-1 accent-green-500"
              />
              <span className="text-sm font-mono font-bold text-green-400 w-12">{shareTarget}%</span>
            </div>
            <div className="text-[10px] text-slate-500">Meta de usuários (SOM): {formatNumber(som)}</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex flex-col justify-center items-center text-center">
            <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Potencial de Receita (Mensal)</div>
            <div className="text-xl font-black text-green-400">
              {formatCurrency(som * currentParams.ridesPerUserMonth * currentParams.avgFare)}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">Baseado em {currentParams.ridesPerUserMonth} corridas/usuário</div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: ENGENHARIA DE PREÇO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm h-full">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Simulador Técnico</h3>
            </div>
            <button onClick={resetTariffs} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-500/50 px-2 py-1 rounded transition-colors">
              Resetar
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tarifas</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedScheduleId}
                    onChange={(e) => setSelectedScheduleId(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none"
                  >
                    {tariffSchedules.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.10" 
                      min="0"
                      value={baseFare} 
                      onChange={e => setBaseFare(Number(e.target.value))} 
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 pl-8 text-sm text-white text-center font-bold" 
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tarifa Mínima</label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.10" 
                    min="0"
                    value={minFare} 
                    onChange={e => setMinFare(Number(e.target.value))} 
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 pl-8 text-sm text-white text-left font-bold" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Custo / KM</label>
                <input type="number" step="0.10" min="0" value={costPerKm} onChange={e => setCostPerKm(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Custo / Min</label>
                <input type="number" step="0.05" min="0" value={costPerMin} onChange={e => setCostPerMin(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Distância Média</label>
                <span className="text-xs font-mono text-slate-200">{avgDistance} km</span>
              </div>
              <input type="range" min={1} max={20} step={0.1} value={avgDistance} onChange={e => setAvgDistance(Number(e.target.value))} className="w-full accent-slate-500" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tempo Estimado</label>
                <span className="text-xs font-mono text-slate-200">{avgTime} min</span>
              </div>
              <input type="range" min={1} max={60} step={1} value={avgTime} onChange={e => setAvgTime(Number(e.target.value))} className="w-full accent-slate-500" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Dinâmica (Multiplicador)</label>
                <span className="text-xs font-mono text-yellow-400">{dynamicFactor.toFixed(1)}x</span>
              </div>
              <input type="range" min={0.5} max={3} step={0.1} value={dynamicFactor} onChange={e => setDynamicFactor(Number(e.target.value))} className="w-full accent-yellow-500" />
            </div>

            <div className="pt-4 border-t border-slate-800 mt-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Ticket Médio de Mercado (Simulado)</h4>
                <button 
                  onClick={exportCompetitorsCSV}
                  className="text-slate-500 hover:text-green-400 transition-colors"
                  title="Exportar CSV"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {COMPETITORS.map((c) => {
                  let estValue = 0;
                  if (avgDistance <= 2) {
                    estValue = 12.90;
                  } else {
                    const raw = c.baseFare + (c.pricePerKm * avgDistance) + (c.pricePerMin * avgTime);
                    estValue = Math.max(12.90, raw);
                  }
                  const diff = practicedTicket > 0 ? ((estValue - practicedTicket) / practicedTicket) * 100 : 0;
                  return (
                  <div key={c.name} className="flex justify-between items-center bg-slate-800/50 px-2 py-1 rounded border border-slate-700/30">
                    <span className="text-[10px] text-slate-300 w-16">{c.name}</span>
                    <span className="text-[10px] font-bold text-slate-100">{formatCurrency(estValue)}</span>
                    <span className={`text-[9px] font-bold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                    </span>
                  </div>
                  );
                })}
                <div className="flex justify-between items-center bg-slate-800/50 px-2 py-1 rounded border border-yellow-500/30">
                   <span className="text-[10px] text-yellow-400">TKX Franca</span>
                   <span className="text-[10px] font-bold text-yellow-400">{formatCurrency(practicedTicket)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Análise de Competitividade</h3>
                <p className="text-xs text-slate-400">Comparativo: Custo Técnico vs. Praticado (Slider) vs. Concorrência</p>
              </div>
              <div className={`px-4 py-2 rounded-lg border ${isUnderPriced ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-green-500/10 border-green-500/50 text-green-400'}`}>
                <div className="text-[10px] uppercase font-bold mb-1">Resultado da Análise</div>
                <div className="flex items-center gap-2 font-bold">
                  {isUnderPriced ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isUnderPriced ? 'SUBFATURADO' : 'LUCRATIVO'}
                </div>
                <div className="text-[10px] mt-1">
                  {isUnderPriced 
                    ? `Prejuízo técnico de ${formatCurrency(Math.abs(priceDelta))} por corrida` 
                    : `Margem técnica de ${formatCurrency(priceDelta)} por corrida`}
                </div>
              </div>
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={true} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [formatCurrency(value), 'Valor Estimado']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ReferenceLine x={practicedTicket} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Seu Preço', position: 'top', fill: '#fbbf24', fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 flex justify-between items-center">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="font-bold text-slate-200">Ticket Técnico Calculado:</span>
                <div className="group relative">
                  <Info className="w-3 h-3 text-slate-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-950 border border-slate-700 rounded-lg shadow-xl text-[10px] text-slate-300 hidden group-hover:block z-50 pointer-events-none">
                    <div className="font-bold text-yellow-400 mb-1">Fórmula do Ticket Técnico</div>
                    <div className="space-y-1">
                      <p>1. Soma: Base + (Km × Distância) + (Min × Tempo)</p>
                      <p>2. Compara com a <strong>Tarifa Mínima</strong> (prevalece o maior).</p>
                      <p>3. Multiplica pelo fator <strong>Dinâmico</strong> do horário.</p>
                    </div>
                  </div>
                </div>
                <span>{formatCurrency(technicalTicket)}</span>
              </div>
              <div className="text-xs text-slate-400">
                <span className="font-bold text-yellow-400">Ticket Praticado (Slider):</span> {formatCurrency(practicedTicket)}
              </div>
              <div className="w-1/3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Ajustar Ticket</label>
                  <span className="text-[9px] font-bold text-yellow-400">{formatCurrency(currentParams.avgFare)}</span>
                </div>
                <input 
                  type="range" min={10} max={50} step={0.5} 
                  value={currentParams.avgFare} 
                  onChange={(e) => updateCurrentParam('avgFare', Number(e.target.value))}
                  className="w-full accent-yellow-500 h-1"
                />
              </div>
            </div>
          </div>

          {/* Gráfico de Variação Diária */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Variação da Tarifa (24h)
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={3} tickFormatter={(v) => `${v}h`} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    itemStyle={{ color: '#facc15' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [formatCurrency(value), 'Tarifa Estimada']}
                    labelFormatter={(label) => `${label}h`}
                  />
                  <Area type="step" dataKey="price" stroke="#facc15" fillOpacity={1} fill="url(#colorPrice)" />
                  <ReferenceLine 
                    y={avgTechnicalCost} 
                    stroke="#ef4444" 
                    strokeDasharray="3 3" 
                    label={{ 
                      value: `Média: ${formatCurrency(avgTechnicalCost)}`, 
                      position: 'insideTopRight', 
                      fill: '#ef4444', 
                      fontSize: 10,
                      dy: -10
                    }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: UNIT ECONOMICS (DRE POR CORRIDA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Unit Economics (DRE por Corrida)</h3>
            <p className="text-xs text-slate-400">Detalhamento da margem de contribuição e repasse ao motorista.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="overflow-hidden rounded-xl border border-slate-700/50">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Conta do DRE</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">% GMV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="bg-slate-800/30">
                  <td className="px-4 py-2 font-bold text-white">Faturamento Bruto (GMV)</td>
                  <td className="px-4 py-2 text-right font-bold text-white">{formatCurrency(gmv)}</td>
                  <td className="px-4 py-2 text-right text-slate-500">100%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">(-) Taxa Checkout (Gateway {gatewayFeePct}%)</td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(gatewayCost)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(gatewayCost/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">(-) Seguro de Vida (APP)</td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(insuranceFixed)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(insuranceFixed/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">(-) Taxa Tech/Manutenção</td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(techFeeFixed)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(techFeeFixed/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">(-) Provisão Lei 2026</td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(legalProvision)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(legalProvision/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr className="bg-slate-800/50 font-semibold">
                  <td className="px-4 py-2 text-blue-300">(=) Margem Operacional Disponível</td>
                  <td className="px-4 py-2 text-right text-blue-300">{formatCurrency(operationalMargin)}</td>
                  <td className="px-4 py-2 text-right text-slate-500">{(operationalMargin/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-green-400 font-bold">(-) Comissão TKX (Take-Rate 15%)</td>
                  <td className="px-4 py-2 text-right text-green-400 font-bold">{formatCurrency(takeRateGross)}</td>
                  <td className="px-4 py-2 text-right text-slate-500">15.0%</td>
                </tr>
                <tr className="bg-green-900/20 border-t border-green-900/50">
                  <td className="px-4 py-3 font-black text-green-400">(=) Repasse ao Parceiro (Líquido)</td>
                  <td className="px-4 py-3 text-right font-black text-green-400 text-lg">{formatCurrency(driverEarnings)}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-bold">{(driverEarnings/gmv*100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                Reserva de Contingência (Trânsito)
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1">% do Take-Rate para Reserva</label>
                  <input 
                    type="range" min={0} max={5} step={0.1} 
                    value={trafficContingencyPct} onChange={(e) => setTrafficContingencyPct(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-400">{trafficContingencyPct}%</div>
                  <div className="text-xs text-slate-400">{formatCurrency(trafficReserve)} / corrida</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Valor reservado da comissão da plataforma para cobrir variações de tempo excessivas sem cobrar o passageiro.
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Ajuste Fino de Custos Fixos</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-bold">Gateway (%)</label>
                  <input type="number" step="0.1" value={gatewayFeePct} onChange={e => setGatewayFeePct(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-bold">Seguro (R$)</label>
                  <input type="number" step="0.05" value={insuranceFixed} onChange={e => setInsuranceFixed(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-bold">Taxa Tech (R$)</label>
                  <input type="number" step="0.05" value={techFeeFixed} onChange={e => setTechFeeFixed(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-bold">Lei 2026 (R$)</label>
                  <input type="number" step="0.05" value={legalProvision} onChange={e => setLegalProvision(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};