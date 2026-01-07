import React, { useMemo } from 'react';
import { Snapshot } from '../hooks/useSnapshots';
import { ScenarioType, SimulationParams } from '../types';
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
  ReferenceLine,
} from 'recharts';

interface TrendAnalysisTabProps {
  snapshots: Snapshot[];
  calculateProjections: (params: SimulationParams, scenario: ScenarioType) => any[];
}

const TrendAnalysisTab: React.FC<TrendAnalysisTabProps> = ({ snapshots, calculateProjections: calcProj }) => {
  const trendData = useMemo(() => {
    if (snapshots.length < 2) return null;

    // Ordenar por timestamp
    const sortedSnapshots = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

    // Extrair métricas finais de cada snapshot
    const trends = sortedSnapshots.map(snap => {
      const proj = calcProj(snap.paramsMap[snap.activeScenario], snap.activeScenario);
      const finalMonth = proj[35] || proj[proj.length - 1];
      const totalRevenue = proj.reduce((a, m) => a + m.grossRevenue, 0);
      const totalProfit = proj.reduce((a, m) => a + m.netProfit, 0);
      const totalRides = proj.reduce((a, m) => a + m.rides, 0);

      return {
        name: snap.name,
        date: new Date(snap.timestamp).toLocaleDateString('pt-BR'),
        revenue: totalRevenue,
        profit: totalProfit,
        users: finalMonth.users,
        drivers: finalMonth.drivers,
        ltv: finalMonth.ltv || 0,
        cac: finalMonth.cac || 0,
        rides: totalRides,
        margin: (totalProfit / totalRevenue) * 100 || 0,
      };
    });

    return trends;
  }, [snapshots, calcProj]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const formatNumber = (value: number) =>
    value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  const formatPercent = (value: number) =>
    `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6 text-slate-100">
      {trendData && trendData.length >= 2 ? (
        <>
          {/* Tabela de Tendências */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700 overflow-x-auto">
            <h3 className="text-lg font-bold mb-4 text-yellow-300">📊 Evolução de Snapshots</h3>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-600">
                <tr>
                  <th className="text-left py-2 px-3 text-yellow-300">Snapshot</th>
                  <th className="text-right py-2 px-3 text-green-400">Receita</th>
                  <th className="text-right py-2 px-3 text-blue-400">Lucro</th>
                  <th className="text-right py-2 px-3 text-purple-400">Usuários</th>
                  <th className="text-right py-2 px-3 text-orange-400">Motoristas</th>
                  <th className="text-right py-2 px-3 text-cyan-400">Margem</th>
                  <th className="text-right py-2 px-3 text-pink-400">LTV</th>
                  <th className="text-right py-2 px-3 text-indigo-400">CAC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {trendData.map((trend, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-3 font-mono text-xs">
                      <div className="font-bold">{trend.name}</div>
                      <div className="text-slate-500">{trend.date}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-green-400">{formatCurrency(trend.revenue)}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">{formatCurrency(trend.profit)}</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-400">{formatNumber(trend.users)}</td>
                    <td className="py-3 px-3 text-right font-mono text-orange-400">{formatNumber(trend.drivers)}</td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-400">{formatPercent(trend.margin)}</td>
                    <td className="py-3 px-3 text-right font-mono text-pink-400">{formatCurrency(trend.ltv)}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-400">{formatCurrency(trend.cac)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gráfico Receita e Lucro */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-green-300">💹 Tendência de Receita e Lucro</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number, name) => {
                    if (name === 'Receita' || name === 'Lucro') return formatCurrency(value);
                    return value;
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Receita" />
                <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#f59e0b" name="Lucro" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Usuários e Motoristas */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-purple-300">👥 Crescimento de Base</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8b5cf6"
                  name="Usuários"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="drivers"
                  stroke="#f97316"
                  name="Motoristas"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico LTV vs CAC */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-pink-300">💰 Dinâmica LTV/CAC</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ltv"
                  stroke="#ec4899"
                  name="LTV (Dinâmico)"
                  strokeWidth={2}
                  dot={{ fill: '#ec4899', r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cac"
                  stroke="#06b6d4"
                  name="CAC (Realista)"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 5 }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={0}
                  stroke="#666"
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Margem */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-cyan-300">📈 Evolução de Margem (%)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => formatPercent(value)}
                />
                <Bar dataKey="margin" fill="#14b8a6" name="Margem (%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-lg p-8 text-center text-slate-400">
          <p>Crie pelo menos 2 snapshots para visualizar as tendências</p>
        </div>
      )}
    </div>
  );
};

export default TrendAnalysisTab;
