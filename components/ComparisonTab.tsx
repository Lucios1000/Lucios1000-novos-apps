import React, { useState, useMemo } from 'react';
import { Snapshot } from '../hooks/useSnapshots';
import { ScenarioType, SimulationParams } from '../types';
import { calculateProjections } from '../services/financeEngine';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

interface ComparisonTabProps {
  snapshots: Snapshot[];
  calculateProjections: (params: SimulationParams, scenario: ScenarioType) => any[];
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({ snapshots, calculateProjections: calcProj }) => {
  const [selectedSnapshots, setSelectedSnapshots] = useState<[string | null, string | null]>([null, null]);

  const comparisonData = useMemo(() => {
    if (!selectedSnapshots[0] || !selectedSnapshots[1]) return null;

    const snap1 = snapshots.find(s => s.id === selectedSnapshots[0]);
    const snap2 = snapshots.find(s => s.id === selectedSnapshots[1]);

    if (!snap1 || !snap2) return null;

    // Usar o cenário ativo de cada snapshot
    const proj1 = calcProj(snap1.paramsMap[snap1.activeScenario], snap1.activeScenario);
    const proj2 = calcProj(snap2.paramsMap[snap2.activeScenario], snap2.activeScenario);

    // Montar comparativo por mês
    return {
      monthly: proj1.slice(0, 36).map((m1, idx) => {
        const m2 = proj2[idx];
        return {
          month: `M${idx + 1}`,
          revenue1: m1.grossRevenue,
          revenue2: m2.grossRevenue,
          users1: m1.users,
          users2: m2.users,
          drivers1: m1.drivers,
          drivers2: m2.drivers,
          profit1: m1.netProfit,
          profit2: m2.netProfit,
        };
      }),
      totals: {
        name: 'Comparação 36 meses',
        revenue1: proj1.reduce((a, m) => a + m.grossRevenue, 0),
        revenue2: proj2.reduce((a, m) => a + m.grossRevenue, 0),
        users1: proj1[35]?.users || 0,
        users2: proj2[35]?.users || 0,
        drivers1: proj1[35]?.drivers || 0,
        drivers2: proj2[35]?.drivers || 0,
        profit1: proj1.reduce((a, m) => a + m.netProfit, 0),
        profit2: proj2.reduce((a, m) => a + m.netProfit, 0),
      },
      snap1,
      snap2,
    };
  }, [selectedSnapshots, snapshots, calcProj]);

  const handleSelectSnapshot = (index: 0 | 1, snapshotId: string) => {
    setSelectedSnapshots(prev => {
      const newSelection: [string | null, string | null] = [...prev] as any;
      newSelection[index] = snapshotId;
      return newSelection;
    });
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const formatNumber = (value: number) =>
    value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Seletores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((idx: 0 | 1) => (
          <div key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-yellow-300">
              {idx === 0 ? '📊 Cenário 1' : '📊 Cenário 2'}
            </h3>
            <select
              value={selectedSnapshots[idx] || ''}
              onChange={e => handleSelectSnapshot(idx, e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600 hover:border-yellow-400 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Selecione um snapshot...</option>
              {snapshots.map(snap => (
                <option key={snap.id} value={snap.id}>
                  {snap.name} ({new Date(snap.timestamp).toLocaleDateString('pt-BR')})
                </option>
              ))}
            </select>
            {selectedSnapshots[idx] && comparisonData && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receita Total:</span>
                  <span className="font-mono font-semibold text-green-400">
                    {formatCurrency(idx === 0 ? comparisonData.totals.revenue1 : comparisonData.totals.revenue2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lucro Total:</span>
                  <span className="font-mono font-semibold text-blue-400">
                    {formatCurrency(idx === 0 ? comparisonData.totals.profit1 : comparisonData.totals.profit2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Usuários Finais:</span>
                  <span className="font-mono font-semibold text-purple-400">
                    {formatNumber(idx === 0 ? comparisonData.totals.users1 : comparisonData.totals.users2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Motoristas Finais:</span>
                  <span className="font-mono font-semibold text-orange-400">
                    {formatNumber(idx === 0 ? comparisonData.totals.drivers1 : comparisonData.totals.drivers2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {comparisonData && (
        <>
          {/* Gráfico Receita */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-cyan-300">📈 Receita Bruta Comparada</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonData.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue1"
                  stroke="#10b981"
                  name={`${comparisonData.snap1.name}`}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="revenue2"
                  stroke="#f59e0b"
                  name={`${comparisonData.snap2.name}`}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Lucro */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-blue-300">💰 Lucro Líquido Comparado</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonData.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit1"
                  stroke="#3b82f6"
                  name={`${comparisonData.snap1.name}`}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="profit2"
                  stroke="#ec4899"
                  name={`${comparisonData.snap2.name}`}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Usuários */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-purple-300">👥 Crescimento de Usuários</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonData.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users1"
                  stroke="#8b5cf6"
                  name={`${comparisonData.snap1.name}`}
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="users2"
                  stroke="#06b6d4"
                  name={`${comparisonData.snap2.name}`}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!comparisonData && (
        <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-lg p-8 text-center text-slate-400">
          <p>Selecione dois snapshots para comparar</p>
        </div>
      )}
    </div>
  );
};

export default ComparisonTab;
