import React, { useEffect, useMemo, useState } from 'react';
import { ScenarioType, SimulationParams } from '../types';

type Props = {
  scenario: ScenarioType;
  currentParams: SimulationParams;
  updateCurrentParam: (key: keyof SimulationParams, value: any) => void;
};

interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeCity {
  id: number;
  nome: string;
}

const formatNumber = (value?: number) =>
  typeof value === 'number' ? value.toLocaleString('pt-BR') : '—';

const PercentDisplay: React.FC<{ value?: number; digits?: number }> = ({ value, digits = 1 }) => (
  <span className="font-mono text-sm font-semibold">{typeof value === 'number' ? `${value.toFixed(digits)}%` : '—'}</span>
);

const NumberDisplay: React.FC<{ value?: number }> = ({ value }) => (
  <span className="font-mono text-sm font-semibold text-slate-100">{formatNumber(value)}</span>
);

const formatCurrency = (value?: number) =>
  typeof value === 'number'
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

const StrategicInputsTab: React.FC<Props> = ({ scenario, currentParams, updateCurrentParam }) => {
  const [states, setStates] = useState<IbgeState[]>([]);
  const [cities, setCities] = useState<IbgeCity[]>([]);
  const [selectedUfId, setSelectedUfId] = useState<number | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPopulation, setLoadingPopulation] = useState(false);
  const [populationYear, setPopulationYear] = useState<number | null>(null);
  const [samPercentInput, setSamPercentInput] = useState<number>(50);

  // Carrega estados (UF)
  useEffect(() => {
    const loadStates = async () => {
      try {
        const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        const data: any[] = await res.json();
        setStates((data || []).map((s) => ({ id: s.id, sigla: s.sigla, nome: s.nome })));
      } catch (e) {
        console.warn('Falha ao carregar estados IBGE:', e);
      }
    };
    loadStates();
  }, []);

  // Carrega cidades ao selecionar UF
  useEffect(() => {
    const loadCities = async () => {
      if (!selectedUfId) return;
      setLoadingCities(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUfId}/municipios?orderBy=nome`);
        const data: any[] = await res.json();
        setCities((data || []).map((c) => ({ id: c.id, nome: c.nome })));
      } catch (e) {
        console.warn('Falha ao carregar municípios IBGE:', e);
      } finally {
        setLoadingCities(false);
      }
    };
    loadCities();
  }, [selectedUfId]);

  const handleCitySelect = async (cityId: number) => {
    const city = cities.find((c) => c.id === cityId);
    updateCurrentParam('selectedCityId', cityId);
    updateCurrentParam('selectedCityName', city?.nome || undefined);
    // Busca população estimada (TAM)
    setLoadingPopulation(true);
    try {
      // Tenta cache local primeiro
      try {
        const cacheStr = localStorage.getItem('tkx_ibge_population_cache');
        if (cacheStr) {
          const cache = JSON.parse(cacheStr) as Record<string, { value: number; year: number; at: number }>;
          const entry = cache[String(cityId)];
          if (entry && entry.value > 0) {
            updateCurrentParam('cityPopulation', entry.value);
            const samCalcCached = Math.round(entry.value * (samPercentInput / 100));
            updateCurrentParam('samPopulation', samCalcCached);
            setPopulationYear(entry.year || null);
            return;
          }
        }
      } catch {}

      // Tabela 6579 (Estimativas de População) • Variável 9324 (População estimada)
      // Primeiro tenta 2024; se não houver, cai para 2022 (Censo mais recente)
      const fetchYear = async (year: number) => {
        const url = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/${year}/variaveis/9324?localidades=N6[${cityId}]`;
        const res = await fetch(url);
        const json = await res.json();
        // Formato oficial v3: array com resultados/series/serie[year]
        const valueStr = json?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[String(year)]
          // Alguns ambientes devolvem camelCase 'results'
          ?? json?.results?.[0]?.series?.[0]?.serie?.[String(year)]
          // Ou direto em 'series' nível raiz
          ?? json?.series?.[0]?.serie?.[String(year)];
        return Number(valueStr) || 0;
      };

      let usedYear: number | null = null;
      let population = await fetchYear(2024);
      if (population && population > 0) {
        usedYear = 2024;
      } else {
        population = await fetchYear(2022);
        if (population && population > 0) usedYear = 2022;
      }
      updateCurrentParam('cityPopulation', population);
      const samCalc = Math.round(population * (samPercentInput / 100));
      updateCurrentParam('samPopulation', samCalc);
      setPopulationYear(usedYear);
      // Grava cache local
      try {
        const cacheStr = localStorage.getItem('tkx_ibge_population_cache');
        const cache = cacheStr ? (JSON.parse(cacheStr) as Record<string, { value: number; year: number; at: number }>) : {};
        cache[String(cityId)] = { value: population, year: usedYear || 0, at: Date.now() };
        localStorage.setItem('tkx_ibge_population_cache', JSON.stringify(cache));
      } catch {}
    } catch (e) {
      console.warn('Falha ao carregar população IBGE:', e);
    } finally {
      setLoadingPopulation(false);
    }
  };

  // Atualiza SAM via % editável
  useEffect(() => {
    const tam = currentParams.cityPopulation || 0;
    if (tam > 0) {
      const samCalc = Math.round(tam * (samPercentInput / 100));
      updateCurrentParam('samPopulation', samCalc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samPercentInput]);

  const somValue = useMemo(() => {
    const sam = currentParams.samPopulation || 0;
    const mkt = currentParams.marketShareTarget || 0;
    return Math.round(sam * (mkt / 100));
  }, [currentParams.samPopulation, currentParams.marketShareTarget]);

  // — Simulador Técnico (independente dos sliders) —
  const [minFareActive, setMinFareActive] = useState<number>(1.0); // Tarifa mínima por faixa (R$)
  const [baseRatePerKm, setBaseRatePerKm] = useState<number>(1.5); // Tarifa Base (R$/km)
  const [valuePerKm, setValuePerKm] = useState<number>(1.2); // Valor por KM (R$/km)
  const [valuePerMinute, setValuePerMinute] = useState<number>(0.3); // Valor por Min (R$/min)
  const [simKm, setSimKm] = useState<number>(5);
  const [simMinutes, setSimMinutes] = useState<number>(12);
  const [dynamicPct, setDynamicPct] = useState<number>(0);

  const technicalTicket = useMemo(() => {
    const sum = (minFareActive || 0)
      + (baseRatePerKm || 0) * (simKm || 0)
      + (valuePerKm || 0) * (simKm || 0)
      + (valuePerMinute || 0) * (simMinutes || 0);
    const factor = 1 + ((dynamicPct || 0) / 100);
    return Math.max(0, sum * factor);
  }, [minFareActive, baseRatePerKm, valuePerKm, valuePerMinute, simKm, simMinutes, dynamicPct]);

  const sliderTicket = currentParams.avgFare || 0; // Valor atual do slider (tarifa média)
  const diffRS = technicalTicket - sliderTicket;
  const diffPct = sliderTicket > 0 ? (diffRS / sliderTicket) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase text-yellow-500">Inputs Estratégicos</h3>
        <span className="text-[10px] text-slate-400 px-2 py-1 rounded-full bg-slate-800 border border-slate-700">IBGE • TAM/SAM/SOM</span>
      </div>

      {/* Seletor de Localidade (UF → Município) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Estado (UF)</div>
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={selectedUfId ?? ''}
              onChange={(e) => setSelectedUfId(Number(e.target.value) || null)}
              data-testid="ibge-uf"
            >
              <option value="">Selecione</option>
              {states.map((uf) => (
                <option key={uf.id} value={uf.id}>{uf.nome} ({uf.sigla})</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase text-slate-400 font-black">Município</div>
              {loadingCities && <span className="text-[10px] text-slate-500">Carregando…</span>}
            </div>
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={currentParams.selectedCityId ?? ''}
              onChange={(e) => handleCitySelect(Number(e.target.value))}
              disabled={!selectedUfId}
              data-testid="ibge-city"
            >
              <option value="">Selecione</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase text-slate-400 font-black">População (TAM)</div>
              <div className="flex items-center gap-2">
                {populationYear === 2022 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30" data-testid="ibge-census-badge">Censo 2022</span>
                )}
                {loadingPopulation && <span className="text-[10px] text-slate-500">Consultando IBGE…</span>}
              </div>
            </div>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              placeholder="Ex.: 355919"
              value={currentParams.cityPopulation ?? 0}
              onChange={(e) => updateCurrentParam('cityPopulation', Number(e.target.value))}
              data-testid="tam-input"
            />
            <div className="text-[11px] text-slate-500 mt-1">Busca automática via IBGE ao selecionar município.</div>
          </div>
        </div>
      </div>

      {/* Cálculo de Mercado: TAM → SAM (editável %) → SOM */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">TAM (População)</div>
            <div className="text-2xl font-black text-white"><NumberDisplay value={currentParams.cityPopulation} /></div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase text-slate-400 font-bold">SAM (% da População)</div>
              <span className="text-[10px] text-slate-400">{samPercentInput.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={samPercentInput}
              onChange={(e) => setSamPercentInput(Number(e.target.value))}
              className="w-full accent-yellow-500"
              data-testid="sam-percent"
            />
            <div className="text-sm font-black text-yellow-400 mt-1">
              <span data-testid="sam-output"><NumberDisplay value={currentParams.samPopulation} /></span>
            </div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Market Share Alvo (%)</div>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              placeholder="Ex.: 15"
              value={currentParams.marketShareTarget ?? 0}
              onChange={(e) => updateCurrentParam('marketShareTarget', Number(e.target.value))}
              data-testid="market-share"
            />
            <div className="text-[11px] text-slate-500 mt-1">Usado para estimar SOM sobre o SAM.</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">SOM (Estimado)</div>
            <div className="text-2xl font-black text-gradient-gold" data-testid="som-output"><NumberDisplay value={somValue} /></div>
            <div className="text-[11px] text-slate-500">SOM = SAM × Market Share Alvo</div>
          </div>
        </div>
      </div>

      {/* Metadados selecionados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card-gradient bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-xl">
          <div className="text-[8px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-2">Município</div>
          <div className="text-sm font-black text-white">{currentParams.selectedCityName || '—'}</div>
        </div>
        <div className="card-gradient bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-xl">
          <div className="text-[8px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-2">UF Selecionada</div>
          <div className="text-sm font-black text-white">{states.find(s => s.id === selectedUfId)?.sigla || '—'}</div>
        </div>
        <div className="card-gradient bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 p-4 rounded-xl">
          <div className="text-[8px] uppercase text-slate-500 font-bold tracking-[0.08em] mb-2">Cenário</div>
          <div className="text-sm font-black text-white">{scenario}</div>
        </div>
      </div>

      {/* Simulador Técnico (oculto por padrão) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] uppercase text-slate-400 font-black">Simulador Técnico (independente dos sliders)</h4>
          <span className="text-[10px] text-slate-500">Uso interno: conferência de ticket</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-[10px] uppercase text-slate-400 font-bold">Tarifa Mínima (R$)</div>
            <input
              type="number"
              step={0.1}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={minFareActive}
              onChange={(e) => setMinFareActive(Number(e.target.value))}
              placeholder="Ex.: 1.0"
              data-testid="sim-min-fare"
            />

            <div className="text-[10px] uppercase text-slate-400 font-bold mt-3">Tarifa Base (R$/km)</div>
            <input
              type="number"
              step={0.1}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={baseRatePerKm}
              onChange={(e) => setBaseRatePerKm(Number(e.target.value))}
              data-testid="sim-base-per-km"
            />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase text-slate-400 font-bold">Valor por KM (R$/km)</div>
            <input
              type="number"
              step={0.1}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={valuePerKm}
              onChange={(e) => setValuePerKm(Number(e.target.value))}
              data-testid="sim-val-per-km"
            />
            <div className="text-[10px] uppercase text-slate-400 font-bold mt-3">Valor por Minuto (R$/min)</div>
            <input
              type="number"
              step={0.05}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={valuePerMinute}
              onChange={(e) => setValuePerMinute(Number(e.target.value))}
              data-testid="sim-val-per-min"
            />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase text-slate-400 font-bold">Simulador de KM (distância)</div>
            <input
              type="number"
              step={0.1}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={simKm}
              onChange={(e) => setSimKm(Number(e.target.value))}
              data-testid="sim-km"
            />
            <div className="text-[10px] uppercase text-slate-400 font-bold mt-3">Simulador de Minutos (tempo)</div>
            <input
              type="number"
              step={1}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={simMinutes}
              onChange={(e) => setSimMinutes(Number(e.target.value))}
              data-testid="sim-minutes"
            />
            <div className="text-[10px] uppercase text-slate-400 font-bold mt-3">% Dinâmica</div>
            <input
              type="number"
              step={1}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              value={dynamicPct}
              onChange={(e) => setDynamicPct(Number(e.target.value))}
              placeholder="Ex.: 25 (para 25%)"
              data-testid="sim-dynamic-pct"
            />
          </div>
        </div>

        {/* Resultado e comparador */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Ticket Técnico Calculado</div>
            <div className="text-2xl font-black text-gradient-gold" data-testid="sim-technical-ticket">{formatCurrency(technicalTicket)}</div>
            <div className="text-[11px] text-slate-500 mt-1">(Min + Base×KM + R$/KM×KM + R$/Min×Min) × Dinâmica</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Valor Atual do Slider</div>
            <div className="text-2xl font-black text-slate-100" data-testid="sim-slider-ticket">{formatCurrency(sliderTicket)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Parametro atual: Tarifa Média</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Variação</div>
            <div className={`text-xl font-black ${diffRS >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="sim-diff-rs">{formatCurrency(diffRS)}</div>
            <div className={`text-sm font-bold ${diffPct >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="sim-diff-pct">{diffPct.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategicInputsTab;
