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

const StrategicInputsTab: React.FC<Props> = ({ scenario, currentParams, updateCurrentParam }) => {
  const [states, setStates] = useState<IbgeState[]>([]);
  const [cities, setCities] = useState<IbgeCity[]>([]);
  const [selectedUfId, setSelectedUfId] = useState<number | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPopulation, setLoadingPopulation] = useState(false);
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
      // Tabela 6579 (Estimativas de População) • Variável 9324 (População estimada)
      // Período mais recente: 2024
      const url = `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2024/variaveis/9324?localidades=N6[${cityId}]`;
      const res = await fetch(url);
      const json = await res.json();
      // Estrutura esperada: { results: [ { series: [ { localidade: { id, nome }, serie: { '2024': 'NNNNNN' } } ] } ] }
      const valueStr = json?.results?.[0]?.series?.[0]?.serie?.['2024'];
      const population = Number(valueStr) || 0;
      updateCurrentParam('cityPopulation', population);
      const samCalc = Math.round(population * (samPercentInput / 100));
      updateCurrentParam('samPopulation', samCalc);
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
              {loadingPopulation && <span className="text-[10px] text-slate-500">Consultando IBGE…</span>}
            </div>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
              placeholder="Ex.: 355919"
              value={currentParams.cityPopulation ?? 0}
              onChange={(e) => updateCurrentParam('cityPopulation', Number(e.target.value))}
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
            />
            <div className="text-sm font-black text-yellow-400 mt-1">
              <NumberDisplay value={currentParams.samPopulation} />
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
            />
            <div className="text-[11px] text-slate-500 mt-1">Usado para estimar SOM sobre o SAM.</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-lg">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">SOM (Estimado)</div>
            <div className="text-2xl font-black text-gradient-gold"><NumberDisplay value={somValue} /></div>
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
    </div>
  );
};

export default StrategicInputsTab;
