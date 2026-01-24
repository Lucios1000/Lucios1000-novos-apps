import React, { useState, useEffect, useMemo } from 'react';
import { SimulationParams } from './types';
import { 
  DollarSign, Car, TrendingUp, MapPin, Users, Target, 
  Calculator, AlertTriangle, CheckCircle2, Building2,
  ShieldCheck, Save, FolderOpen, Trash2, RefreshCw, Clock, Info, Download,
  ToggleLeft, ToggleRight, Table as TableIcon, Database, ChevronLeft, ChevronRight, FileCode, Globe
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area
} from 'recharts';

interface InitialPlanningTabProps {
  currentParams: SimulationParams;
  updateCurrentParam: (key: keyof SimulationParams, value: number) => void;
  worldMode?: 'Virtual' | 'Real';
}

// Dados de demonstração para preenchimento automático de parâmetros técnicos
const DEMO_DATA: Record<string, { population: number, avgDist: number, avgTime: number }> = {
  'Franca': { population: 358539, avgDist: 5.0, avgTime: 12 },
  'Ribeirão Preto': { population: 711825, avgDist: 6.8, avgTime: 15 },
  'São Paulo': { population: 11451245, avgDist: 8.5, avgTime: 25 },
};

const PRESETS_KEY = 'tkx_planning_presets';

// Função pura exportada para testes unitários
export const calculateTechnicalTicket = (
  baseFare: number,
  costPerKm: number,
  avgDistance: number,
  costPerMin: number,
  avgTime: number,
  minFare: number,
  dynamicFactor: number,
  includedKm: number = 0
) => {
  // Lógica atualizada conforme tabela:
  // 1. Custo Base = Valor Inicial + (Km Excedente * Custo/Km)
  // 2. Aplica Dinâmica
  // 3. Resultado final é o maior valor entre (Custo Calculado) e (Tarifa Mínima)
  
  let cost = baseFare;
  if (avgDistance > includedKm) {
    cost += (avgDistance - includedKm) * costPerKm;
  }
  
  return Math.max(minFare, cost * dynamicFactor);
};

export const InitialPlanningTab: React.FC<InitialPlanningTabProps> = ({ currentParams, updateCurrentParam, worldMode = 'Virtual' }) => {
  // --- Estado Local para Inputs Estratégicos ---
  const [ufs, setUfs] = useState<{ id: number; sigla: string; nome: string }[]>([]);
  const [cities, setCities] = useState<{ id: number; nome: string }[]>([]);
  const [selectedUf, setSelectedUf] = useState('SP');
  const [selectedCity, setSelectedCity] = useState('Franca');
  const [population, setPopulation] = useState(358539);
  const [popGrowthRate, setPopGrowthRate] = useState(1.2); // Taxa de crescimento anual (%)
  const [isLoadingPop, setIsLoadingPop] = useState(false);
  
  const [samPercent, setSamPercent] = useState(50); // 40-60% sugestão
  const [shareTarget, setShareTarget] = useState(15); // Market Share Alvo (Sempre iniciar em 15%)
  
  // Configuração Técnica
  const [tariffSchedules, setTariffSchedules] = useState([
    { id: 'dawn', label: 'Madrugada (00h-06h)', start: 0, end: 6, dynamic: 1.4, basePrice: 13.00 },
    { id: 'normal', label: 'Normal (06h-18h)', start: 6, end: 18, dynamic: 1.0, basePrice: 10.10 },
    { id: 'peak', label: 'Pico (18h-21h)', start: 18, end: 21, dynamic: 1.1, basePrice: 10.80 },
    { id: 'night', label: 'Noite (21h-00h)', start: 21, end: 24, dynamic: 1.2, basePrice: 11.50 },
  ]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('normal');

  const currentSchedule = tariffSchedules.find(s => s.id === selectedScheduleId) || tariffSchedules[1];
  const baseFare = currentSchedule.basePrice;
  const dynamicFactor = currentSchedule.dynamic;

  const setBaseFare = (val: number) => {
    if (val < 0) return;
    setTariffSchedules(prev => prev.map(s => s.id === selectedScheduleId ? { ...s, basePrice: val } : s));
  };

  const setDynamicFactor = (val: number) => {
    if (val < 0.5) return;
    setTariffSchedules(prev => prev.map(s => s.id === selectedScheduleId ? { ...s, dynamic: val } : s));
  };
  
  const [costPerKm, setCostPerKm] = useState(2.538);
  const [costPerMin, setCostPerMin] = useState(0); // Substituído por valor inicial fixo na lógica
  const [minFare, setMinFare] = useState(11.50);
  const [includedKm, setIncludedKm] = useState(1.1);
  const [avgDistance, setAvgDistance] = useState(5);
  const [avgTime, setAvgTime] = useState(10);
  
  // Custos Unitários Fixos (DRE Unitário)
  const [gatewayFeePct, setGatewayFeePct] = useState(2.5);
  const [insuranceFixed, setInsuranceFixed] = useState(0.60);
  const [techFeeFixed, setTechFeeFixed] = useState(0.40);
  const [legalProvision, setLegalProvision] = useState(0.35);
  const [trafficContingencyPct, setTrafficContingencyPct] = useState(0);
  
  // Custos do Motorista (Novos parâmetros)
  const [driverFuelCost, setDriverFuelCost] = useState(0.58);
  const [driverMaintenanceCost, setDriverMaintenanceCost] = useState(0.59);

  // Toggles de Despesas
  const [enableGateway, setEnableGateway] = useState(false);
  const [enableInsurance, setEnableInsurance] = useState(false);
  const [enableTech, setEnableTech] = useState(false);
  const [enableLegal, setEnableLegal] = useState(false);
  const [enableDriverCosts, setEnableDriverCosts] = useState(false);

  // Estado dos Concorrentes (Editável)
  const [competitors, setCompetitors] = useState([
    { name: 'Uber', baseFare: 9.0, pricePerKm: 2.0, pricePerMin: 0, minFare: 9.90 },
    { name: '99', baseFare: 8.50, pricePerKm: 2.0, pricePerMin: 0, minFare: 8.90 },
    { name: 'Maxim', baseFare: 7.90, pricePerKm: 2.10, pricePerMin: 0, minFare: 9.00 },
    { name: 'Garupa', baseFare: 10.9, pricePerKm: 2.3, pricePerMin: 0, minFare: 12.0 },
    { name: 'Urban 66', baseFare: 10.0, pricePerKm: 1.9, pricePerMin: 0, minFare: 11.0 },
  ]);

  const handleCompetitorChange = (index: number, field: string, value: number) => {
    const updated = [...competitors];
    (updated[index] as any)[field] = value;
    setCompetitors(updated);
  };

  // --- Gerenciamento de Presets ---
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // --- Simulação de Dados (SQL Mock) ---
  const [mockRides, setMockRides] = useState<any[]>([]);
  const [showOnlyLoss, setShowOnlyLoss] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const downloadSqlSchema = () => {
    const sqlContent = `-- SCHEMA SQL - MUNDO ${worldMode.toUpperCase()} - TKX FRANCA
-- 1. Tabela de Motoristas
CREATE TABLE IF NOT EXISTS motoristas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    taxa_adesao_paga BOOLEAN DEFAULT 0,
    saldo_a_receber REAL DEFAULT 0.00
);

-- 2. Tabela de Horários e Multiplicadores (Para automação das Tabelas 1.0 a 1.3)
CREATE TABLE IF NOT EXISTS grade_horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    periodo TEXT, -- Ex: Madrugada, Pico, Normal
    hora_inicio TIME,
    hora_fim TIME,
    multiplicador REAL -- Ex: 1.20
);

-- 3. Tabela Principal de Corridas (Onde o DRE nasce)
CREATE TABLE IF NOT EXISTS historico_corridas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorista_id INTEGER,
    valor_total_pago REAL, -- Valor do Slider
    km_distancia REAL,
    taxa_app_valor REAL, -- Os 15% calculados na hora
    custo_gateway REAL, -- Os 2.5% 
    custos_fixos_totais REAL, -- Soma do Seguro + Manutencao + Provisao 
    liquido_motorista REAL,
    data_corrida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
);

-- Inserindo os multiplicadores base
INSERT INTO grade_horarios (periodo, hora_inicio, hora_fim, multiplicador) VALUES 
('Madrugada', '00:00', '05:59', 1.2),
('Normal', '06:00', '17:59', 1.0),
('Pico', '18:00', '20:59', 1.1),
('Noite', '21:00', '23:59', 1.2);

-- 4. Refinando a Tabela de Motoristas (com campos reais)
CREATE TABLE IF NOT EXISTS motoristas_cadastro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    telefone TEXT,
    veiculo_modelo TEXT,
    placa TEXT UNIQUE,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pendente' -- pendente, ativo, bloqueado
);

-- 5. Criando a Tabela de Clientes (Passageiros)
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    telefone TEXT UNIQUE NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_corridas INTEGER DEFAULT 0,
    nota_media REAL DEFAULT 5.0
);`;

    const blob = new Blob([sqlContent], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schema_tkx_${worldMode.toLowerCase()}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateMockData = () => {
    const rides = [];
    for (let i = 1; i <= 50; i++) {
      const hour = Math.floor(Math.random() * 24);
      const schedule = tariffSchedules.find(s => hour >= s.start && hour < s.end) || tariffSchedules[0];
      const dist = 2 + Math.random() * 10; // 2-12km
      const time = dist * 2; 

      const totalValue = calculateTechnicalTicket(
        schedule.basePrice, costPerKm, dist, costPerMin, time, minFare, schedule.dynamic, includedKm
      );

      const gateway = enableGateway ? totalValue * (gatewayFeePct / 100) : 0;
      const fixed = (enableInsurance ? insuranceFixed : 0) + (enableTech ? techFeeFixed : 0) + (enableLegal ? legalProvision : 0);
      const takeRate = totalValue * 0.15;
      const net = totalValue - gateway - fixed - takeRate;
      const driverCosts = enableDriverCosts ? dist * (driverFuelCost + driverMaintenanceCost) : 0;
      const realProfit = net - driverCosts;

      rides.push({
        id: i,
        motorista_id: 1000 + i,
        periodo: schedule.label,
        hora: `${hour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        valor_total_pago: totalValue,
        km_distancia: dist,
        taxa_app_valor: takeRate,
        custo_gateway: gateway,
        custos_fixos_totais: fixed,
        liquido_motorista: net,
        lucro_real: realProfit
      });
    }
    setMockRides(rides);
    setCurrentPage(1);
  };

  const filteredRides = useMemo(() => {
    return mockRides.filter(ride => !showOnlyLoss || ride.lucro_real < 0);
  }, [mockRides, showOnlyLoss]);

  const totalPages = Math.ceil(filteredRides.length / itemsPerPage);

  const paginatedRides = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRides.slice(start, start + itemsPerPage);
  }, [filteredRides, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [showOnlyLoss]);

  const simulationStats = useMemo(() => {
    if (!mockRides.length) return null;
    const total = mockRides.length;
    const totalProfit = mockRides.reduce((acc, r) => acc + r.lucro_real, 0);
    const avgProfit = totalProfit / total;
    const lossCount = mockRides.filter(r => r.lucro_real < 0).length;
    const lossPct = (lossCount / total) * 100;
    
    return { total, avgProfit, lossPct };
  }, [mockRides]);

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

  // Cálculo automático do tempo estimado (2 min por km)
  useEffect(() => {
    setAvgTime(Math.round(avgDistance * 2));
  }, [avgDistance]);

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
        costPerKm, costPerMin, minFare, avgDistance, avgTime, includedKm,
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
    setIncludedKm(d.includedKm || 1.5);
    setAvgDistance(d.avgDistance || 5.2);
    setAvgTime(d.avgTime || 12);
    setGatewayFeePct(d.gatewayFeePct || 2.5);
    setInsuranceFixed(d.insuranceFixed || 0.60);
    setTechFeeFixed(d.techFeeFixed || 0.40);
    setLegalProvision(d.legalProvision || 0.35);
    setTrafficContingencyPct(d.trafficContingencyPct || 1.5);
    setDriverFuelCost(d.driverFuelCost || 0.58);
    setDriverMaintenanceCost(d.driverMaintenanceCost || 0.59);
    
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
      { id: 'dawn', label: 'Madrugada (00h-06h)', start: 0, end: 6, dynamic: 1.2, basePrice: 10.00 },
      { id: 'normal', label: 'Normal (06h-18h)', start: 6, end: 18, dynamic: 1.0, basePrice: 10.00 },
      { id: 'peak', label: 'Pico (18h-21h)', start: 18, end: 21, dynamic: 1.1, basePrice: 10.00 },
      { id: 'night', label: 'Noite (21h-00h)', start: 21, end: 24, dynamic: 1.2, basePrice: 10.00 },
    ]);
    setCostPerKm(2.43);
    setCostPerMin(0);
    setIncludedKm(1.5);
    setMinFare(11.50);
  };

  const exportCompetitorsCSV = () => {
    const headers = ['Player', 'Tarifa Estimada', 'Diferenca %'];
    const rows = competitors.map(c => {
      // Cálculo direto: Max(Mínima, Base + (Km * Dist) + (Min * Tempo))
      const estValue = Math.max(c.minFare, c.baseFare + (c.pricePerKm * avgDistance) + (c.pricePerMin * avgTime));
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

  const technicalTicket = calculateTechnicalTicket(baseFare, costPerKm, avgDistance, costPerMin, avgTime, minFare, dynamicFactor, includedKm);
  const practicedTicket = currentParams.avgFare;
  const priceDelta = practicedTicket - technicalTicket;
  const isUnderPriced = priceDelta < 0;

  // Unit Economics
  const gmv = practicedTicket;
  const gatewayCost = enableGateway ? gmv * (gatewayFeePct / 100) : 0;
  const takeRateGross = gmv * 0.15;
  const trafficReserve = takeRateGross * (trafficContingencyPct / 100);
  
  const insuranceCost = enableInsurance ? insuranceFixed : 0;
  const techCost = enableTech ? techFeeFixed : 0;
  const legalCost = enableLegal ? legalProvision : 0;
  const operationalMargin = gmv - gatewayCost - insuranceCost - techCost - legalCost;
  const driverEarnings = operationalMargin - takeRateGross; 
  const driverExpenses = enableDriverCosts ? avgDistance * (driverFuelCost + driverMaintenanceCost) : 0;
  const driverNetProfit = driverEarnings - driverExpenses;

  const comparisonData = [
    { name: 'Custo Técnico', value: technicalTicket, fill: '#94a3b8' },
    { name: 'TKX (Praticado)', value: practicedTicket, fill: isUnderPriced ? '#ef4444' : '#22c55e' },
    ...competitors.map(c => {
      // Cálculo direto com tarifa mínima
      const estimatedValue = Math.max(c.minFare, c.baseFare + (c.pricePerKm * avgDistance) + (c.pricePerMin * avgTime));
      return { name: c.name, value: estimatedValue, fill: '#f59e0b' };
    })
  ];

  // Dados para o gráfico de variação horária
  const hourlyData = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => {
      const s = tariffSchedules.find(ts => h >= ts.start && h < ts.end) || tariffSchedules[0];
      const cost = calculateTechnicalTicket(s.basePrice, costPerKm, avgDistance, costPerMin, avgTime, minFare, s.dynamic, includedKm);
      return { hour: h, price: cost, label: s.label, basePrice: s.basePrice };
    });
  }, [tariffSchedules, costPerKm, avgDistance, costPerMin, avgTime, minFare, includedKm]);

  // Cálculo do Custo Técnico Médio
  const avgTechnicalCost = useMemo(() => {
    if (!hourlyData.length) return 0;
    const total = hourlyData.reduce((acc, curr) => acc + curr.price, 0);
    return total / hourlyData.length;
  }, [hourlyData]);

  // Calculadora detalhada (baseada na lógica Python fornecida)
  const detailedCalculator = useMemo(() => {
    const kmAdicionais = Math.max(0, avgDistance - includedKm);
    const valorAdicional = kmAdicionais * costPerKm;
    const valorBrutoTeorico = baseFare + valorAdicional;
    
    // Aplica dinâmica conforme lógica do ticket técnico
    const valorComDinamica = valorBrutoTeorico * dynamicFactor;
    const valorBruto = Math.max(valorComDinamica, minFare);

    const taxaPlataformaPercent = 15;
    const taxaPlataforma = valorBruto * (taxaPlataformaPercent / 100);
    const valorLiquido = valorBruto - taxaPlataforma;

    const custoKm = enableDriverCosts ? (driverFuelCost + driverMaintenanceCost) : 0;
    const despesasTotais = avgDistance * custoKm;

    const lucroLiquido = valorLiquido - despesasTotais;

    return {
        kmAdicionais, valorAdicional, valorBruto, taxaPlataforma, valorLiquido, despesasTotais, lucroLiquido
    };
  }, [avgDistance, includedKm, costPerKm, baseFare, minFare, dynamicFactor, driverFuelCost, driverMaintenanceCost, enableDriverCosts]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNumber = (val: number) => val.toLocaleString('pt-BR');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Indicador de Mundo */}
      <div className={`p-4 rounded-xl border flex items-center gap-3 ${worldMode === 'Real' ? 'bg-green-900/20 border-green-500/50' : 'bg-blue-900/20 border-blue-500/50'}`}>
        <div className={`p-2 rounded-lg ${worldMode === 'Real' ? 'bg-green-500 text-slate-950' : 'bg-blue-500 text-white'}`}>
          {worldMode === 'Real' ? <Database className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
        </div>
        <div>
          <h3 className={`text-sm font-black uppercase ${worldMode === 'Real' ? 'text-green-400' : 'text-blue-400'}`}>Planejamento - Mundo {worldMode}</h3>
          <p className="text-xs text-slate-400">Os dados definidos aqui serão salvos exclusivamente no banco de dados do modo <strong>{worldMode}</strong>.</p>
        </div>
      </div>

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

          {/* Tabela Visual de Horários (Grade) */}
          <div className="mb-6 bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-800">
              <TableIcon className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">Grade de Horários (SQL: grade_horarios)</span>
            </div>
            <table className="w-full text-[10px] text-left text-slate-300">
              <thead className="text-slate-500 bg-slate-900 uppercase">
                <tr>
                  <th className="px-3 py-1.5">Período</th>
                  <th className="px-3 py-1.5 text-center">Horário</th>
                  <th className="px-3 py-1.5 text-right">Mult.</th>
                  <th className="px-3 py-1.5 text-right">Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tariffSchedules.map(s => (
                  <tr key={s.id} className={selectedScheduleId === s.id ? 'bg-yellow-500/10' : ''}>
                    <td className="px-3 py-1.5 font-medium">{s.label.split('(')[0]}</td>
                    <td className="px-3 py-1.5 text-center text-slate-400">{s.start}h - {s.end}h</td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="relative w-12">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3.0"
                          value={s.dynamic}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            if (newValue >= 0.5 && newValue <= 3.0) {
                              setTariffSchedules(prev => prev.map(schedule =>
                                schedule.id === s.id ? { ...schedule, dynamic: newValue } : schedule
                              ));
                            }
                          }}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-yellow-400 text-right font-bold focus:bg-slate-700 focus:border-yellow-500/50 outline-none"
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-yellow-500 font-bold">x</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="relative w-16">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-500 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          value={s.basePrice}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            if (newValue >= 0) {
                              setTariffSchedules(prev => prev.map(schedule =>
                                schedule.id === s.id ? { ...schedule, basePrice: newValue } : schedule
                              ));
                            }
                          }}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-200 text-right font-bold focus:bg-slate-700 focus:border-yellow-500/50 outline-none"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tarifas / Valor Inicial</label>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Km Incluído na Mínima</label>
                <input type="number" step="0.1" min="0" value={includedKm} onChange={e => setIncludedKm(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
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
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tempo Estimado (2 min/km)</label>
                <span className="text-xs font-mono text-slate-200">{avgTime} min</span>
              </div>
              <input type="range" min={1} max={60} step={1} value={avgTime} disabled className="w-full accent-slate-700 opacity-50 cursor-not-allowed" />
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
                {competitors.map((c) => {
                  const estValue = Math.max(c.minFare, c.baseFare + (c.pricePerKm * avgDistance) + (c.pricePerMin * avgTime));
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

            {/* Nova Calculadora Detalhada */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Detalhamento do Cálculo (Motorista)</h4>
              <div className="bg-slate-950/50 rounded p-3 border border-slate-800 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Distância Total</span>
                  <span className="text-slate-300">{avgDistance} km</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">(-) Km Incluídos</span>
                  <span className="text-slate-300">{includedKm} km</span>
                </div>
                <div className="flex justify-between text-[10px] border-b border-slate-800 pb-1">
                  <span className="text-slate-400">(=) Km Adicionais</span>
                  <span className="text-slate-200 font-bold">{detailedCalculator.kmAdicionais.toFixed(1)} km</span>
                </div>
                
                <div className="flex justify-between text-[10px] pt-1">
                  <span className="text-slate-400">Valor Inicial</span>
                  <span className="text-slate-300">{formatCurrency(baseFare)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">(+) Valor Adicional</span>
                  <span className="text-slate-300">{formatCurrency(detailedCalculator.valorAdicional)}</span>
                </div>
                <div className="flex justify-between text-[10px] border-b border-slate-800 pb-1">
                  <span className="text-slate-100 font-bold">(=) Valor Bruto</span>
                  <span className="text-slate-100 font-bold">{formatCurrency(detailedCalculator.valorBruto)}</span>
                </div>

                <div className="flex justify-between text-[10px] pt-1">
                  <span className="text-red-400">(-) Taxa Plataforma (15%)</span>
                  <span className="text-red-400">{formatCurrency(detailedCalculator.taxaPlataforma)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-blue-300">(=) Valor Líquido</span>
                  <span className="text-blue-300 font-bold">{formatCurrency(detailedCalculator.valorLiquido)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-red-400">(-) Despesas (Comb.+Manut.)</span>
                  <span className="text-red-400">{formatCurrency(detailedCalculator.despesasTotais)}</span>
                </div>
                <div className="flex justify-between text-xs font-black pt-2 border-t border-slate-700">
                  <span className="text-emerald-400">(=) Lucro Líquido</span>
                  <span className="text-emerald-400">{formatCurrency(detailedCalculator.lucroLiquido)}</span>
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
                      <p>1. Se Distância ≤ Km Incluído: <strong>Tarifa Mínima</strong></p>
                      <p>2. Se Distância &gt; Km Incluído: Mínima + (Distância Excedente × Custo/Km)</p>
                      <p>3. Aplica fator <strong>Dinâmico</strong>.</p>
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

            <div className="mt-6 pt-6 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Comparativo de Parâmetros (Unitários)</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-bold">Player</th>
                      <th className="px-4 py-3 text-right font-bold">Base (R$)</th>
                      <th className="px-4 py-3 text-right font-bold">Km (R$)</th>
                      <th className="px-4 py-3 text-right font-bold">Min (R$)</th>
                      <th className="px-4 py-3 text-right font-bold">Mínima (R$)</th>
                      <th className="px-4 py-3 text-right font-bold">Tarifa Est. ({avgDistance}km)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {competitors.map((c, idx) => {
                      const estValue = Math.max(c.minFare, c.baseFare + (c.pricePerKm * avgDistance) + (c.pricePerMin * avgTime));
                      return (
                        <tr key={c.name} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2 font-medium text-slate-200">{c.name}</td>
                          <td className="px-4 py-2 text-right">
                            <input type="number" value={c.baseFare} onChange={(e) => handleCompetitorChange(idx, 'baseFare', Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-right text-xs text-slate-300 focus:border-yellow-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input type="number" value={c.pricePerKm} onChange={(e) => handleCompetitorChange(idx, 'pricePerKm', Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-right text-xs text-slate-300 focus:border-yellow-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input type="number" value={c.pricePerMin} onChange={(e) => handleCompetitorChange(idx, 'pricePerMin', Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-right text-xs text-slate-300 focus:border-yellow-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input type="number" value={c.minFare} onChange={(e) => handleCompetitorChange(idx, 'minFare', Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-right text-xs text-slate-300 focus:border-yellow-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-100">{formatCurrency(estValue)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-yellow-500/10">
                      <td className="px-4 py-2 font-bold text-yellow-400">TKX Franca (Técnico)</td>
                      <td className="px-4 py-2 text-right text-yellow-400">{formatCurrency(baseFare)}</td>
                      <td className="px-4 py-2 text-right text-yellow-400">{formatCurrency(costPerKm)}</td>
                      <td className="px-4 py-2 text-right text-yellow-400">{formatCurrency(costPerMin)}</td>
                      <td className="px-4 py-2 text-right text-yellow-400">{formatCurrency(minFare)}</td>
                      <td className="px-4 py-2 text-right font-black text-yellow-400">{formatCurrency(technicalTicket)}</td>
                    </tr>
                  </tbody>
                </table>
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
                  <td className="px-4 py-2 pl-6 text-red-300">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEnableGateway(!enableGateway)} className={enableGateway ? "text-green-400" : "text-slate-600"}>
                        {enableGateway ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <span className={!enableGateway ? "line-through opacity-50" : ""}>(-) Taxa Checkout (Gateway {gatewayFeePct}%)</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(gatewayCost)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(gatewayCost/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEnableInsurance(!enableInsurance)} className={enableInsurance ? "text-green-400" : "text-slate-600"}>
                        {enableInsurance ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <span className={!enableInsurance ? "line-through opacity-50" : ""}>(-) Seguro de Vida (APP)</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(insuranceCost)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(insuranceCost/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEnableTech(!enableTech)} className={enableTech ? "text-green-400" : "text-slate-600"}>
                        {enableTech ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <span className={!enableTech ? "line-through opacity-50" : ""}>(-) Taxa Tech/Manutenção</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(techCost)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(techCost/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEnableLegal(!enableLegal)} className={enableLegal ? "text-green-400" : "text-slate-600"}>
                        {enableLegal ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <span className={!enableLegal ? "line-through opacity-50" : ""}>(-) Provisão Lei 2026</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(legalCost)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(legalCost/gmv*100).toFixed(1)}%</td>
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
                <tr>
                  <td className="px-4 py-2 pl-6 text-red-300">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEnableDriverCosts(!enableDriverCosts)} className={enableDriverCosts ? "text-green-400" : "text-slate-600"}>
                        {enableDriverCosts ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <span className={!enableDriverCosts ? "line-through opacity-50" : ""}>(-) Custos Operacionais Motorista (Combustível/Manutenção)</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-red-300">{formatCurrency(driverExpenses)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{(driverExpenses/gmv*100).toFixed(1)}%</td>
                </tr>
                <tr className="bg-emerald-900/30 border-t border-emerald-500/50">
                  <td className="px-4 py-3 font-black text-emerald-400">(=) Lucro Líquido Motorista</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-400 text-xl">{formatCurrency(driverNetProfit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-500 font-bold">{(driverNetProfit/gmv*100).toFixed(1)}%</td>
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
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Custos Fixos & Motorista</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Gateway (%)</label>
                    <button onClick={() => setEnableGateway(!enableGateway)} className={enableGateway ? "text-green-400" : "text-slate-600"} title={enableGateway ? "Desativar" : "Ativar"}>
                      {enableGateway ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                  </div>
                  <input type="number" step="0.1" value={gatewayFeePct} onChange={e => setGatewayFeePct(Number(e.target.value))} className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white ${!enableGateway ? 'opacity-50' : ''}`} disabled={!enableGateway} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Seguro (R$)</label>
                    <button onClick={() => setEnableInsurance(!enableInsurance)} className={enableInsurance ? "text-green-400" : "text-slate-600"} title={enableInsurance ? "Desativar" : "Ativar"}>
                      {enableInsurance ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                  </div>
                  <input type="number" step="0.05" value={insuranceFixed} onChange={e => setInsuranceFixed(Number(e.target.value))} className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white ${!enableInsurance ? 'opacity-50' : ''}`} disabled={!enableInsurance} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Taxa Tech (R$)</label>
                    <button onClick={() => setEnableTech(!enableTech)} className={enableTech ? "text-green-400" : "text-slate-600"} title={enableTech ? "Desativar" : "Ativar"}>
                      {enableTech ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                  </div>
                  <input type="number" step="0.05" value={techFeeFixed} onChange={e => setTechFeeFixed(Number(e.target.value))} className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white ${!enableTech ? 'opacity-50' : ''}`} disabled={!enableTech} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Lei 2026 (R$)</label>
                    <button onClick={() => setEnableLegal(!enableLegal)} className={enableLegal ? "text-green-400" : "text-slate-600"} title={enableLegal ? "Desativar" : "Ativar"}>
                      {enableLegal ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                  </div>
                  <input type="number" step="0.05" value={legalProvision} onChange={e => setLegalProvision(Number(e.target.value))} className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white ${!enableLegal ? 'opacity-50' : ''}`} disabled={!enableLegal} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Combustível/Km (R$)</label>
                    <button onClick={() => setEnableDriverCosts(!enableDriverCosts)} className={enableDriverCosts ? "text-green-400" : "text-slate-600"} title={enableDriverCosts ? "Desativar" : "Ativar"}>
                      {enableDriverCosts ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                  </div>
                  <input type="number" step="0.01" value={driverFuelCost} onChange={e => setDriverFuelCost(Number(e.target.value))} className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white ${!enableDriverCosts ? 'opacity-50' : ''}`} disabled={!enableDriverCosts} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold">Veículo/Km (R$)</label>
                    <button onClick={() => setEnableDriverCosts(!enableDriverCosts)} className={enableDriverCosts ? "text-green-400" : "text-slate-600"} title={enableDriverCosts ? "Desativar" : "Ativar"}>
                      {enableDriverCosts ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                  </div>
                  <input type="number" step="0.01" value={driverMaintenanceCost} onChange={e => setDriverMaintenanceCost(Number(e.target.value))} className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white ${!enableDriverCosts ? 'opacity-50' : ''}`} disabled={!enableDriverCosts} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: SIMULAÇÃO DE DADOS (SQL PREVIEW) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Simulação de Histórico (SQL Preview)</h3>
              <p className="text-xs text-slate-400">Geração de dados para a tabela <code>historico_corridas</code> do <strong>Mundo {worldMode}</strong>.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadSqlSchema}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              <FileCode className="w-3 h-3" /> Baixar Schema SQL
            </button>
            <button
              onClick={() => setShowOnlyLoss(!showOnlyLoss)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${showOnlyLoss ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
              <AlertTriangle className="w-3 h-3" /> Apenas Prejuízo
            </button>
            <button 
              onClick={generateMockData}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Gerar Dados Fictícios
            </button>
          </div>
        </div>

        {simulationStats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total de Corridas</div>
              <div className="text-lg font-black text-white">{simulationStats.total}</div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Média de Lucro</div>
              <div className={`text-lg font-black ${simulationStats.avgProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(simulationStats.avgProfit)}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="text-[10px] text-slate-400 uppercase font-bold">% de Prejuízo</div>
              <div className={`text-lg font-black ${simulationStats.lossPct > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {simulationStats.lossPct.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {mockRides.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-800">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Motorista ID</th>
                  <th className="px-4 py-3">Período/Hora</th>
                  <th className="px-4 py-3 text-right">Distância</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3 text-right text-red-400">Taxa App (15%)</th>
                  <th className="px-4 py-3 text-right text-red-400">Gateway</th>
                  <th className="px-4 py-3 text-right text-red-400">Fixos</th>
                  <th className="px-4 py-3 text-right font-bold text-green-400">Líquido Mot.</th>
                  <th className="px-4 py-3 text-center">Status (Lucro Real)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedRides.map((ride) => (
                  <tr key={ride.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2 font-mono text-slate-500">#{ride.id}</td>
                    <td className="px-4 py-2 font-mono text-slate-400">{ride.motorista_id}</td>
                    <td className="px-4 py-2">
                      <div className="font-bold text-slate-200">{ride.periodo}</div>
                      <div className="text-[10px] text-slate-500">{ride.hora}</div>
                    </td>
                    <td className="px-4 py-2 text-right">{ride.km_distancia.toFixed(1)} km</td>
                    <td className="px-4 py-2 text-right font-bold text-white">{formatCurrency(ride.valor_total_pago)}</td>
                    <td className="px-4 py-2 text-right text-red-300">{formatCurrency(ride.taxa_app_valor)}</td>
                    <td className="px-4 py-2 text-right text-red-300">{formatCurrency(ride.custo_gateway)}</td>
                    <td className="px-4 py-2 text-right text-red-300">{formatCurrency(ride.custos_fixos_totais)}</td>
                    <td className="px-4 py-2 text-right font-black text-green-400 bg-green-900/10">{formatCurrency(ride.liquido_motorista)}</td>
                    <td className="px-4 py-2 text-center">
                      {ride.lucro_real > 0 ? (
                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold">Lucrativa</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold">Prejuízo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRides.length > itemsPerPage && (
              <div className="flex items-center justify-between p-3 bg-slate-800/50 border-t border-slate-700/50">
                <div className="text-[10px] text-slate-400">
                  Mostrando <span className="font-bold text-slate-200">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-bold text-slate-200">{Math.min(currentPage * itemsPerPage, filteredRides.length)}</span> de <span className="font-bold text-slate-200">{filteredRides.length}</span> registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
                    title="Página Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono text-slate-400">
                    Página <span className="text-slate-200 font-bold">{currentPage}</span> de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
                    title="Próxima Página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
            Clique em "Gerar Dados Fictícios" para simular registros da tabela SQL.
          </div>
        )}
      </div>
    </div>
  );
};