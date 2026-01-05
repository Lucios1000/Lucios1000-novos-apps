import React from 'react';

interface FinancialTableProps {
  data: any[];
  formatCurrency: (val: number) => string;
}

const FinancialTable: React.FC<FinancialTableProps> = ({ data, formatCurrency }) => {
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 text-[10px] uppercase font-black">
              <th className="p-4">Mês</th>
              <th className="p-4">Receita Bruta</th>
              <th className="p-4 text-yellow-500">Receita TKX</th>
              <th className="p-4">Custos Var.</th>
              <th className="p-4">Marketing</th>
              <th className="p-4 text-green-400">Lucro Líquido</th>
              <th className="p-4">Margem</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.month} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td className="p-4 text-white font-medium">{m.monthName}</td>
                <td className="p-4 text-slate-300">{formatCurrency(m.grossRevenue)}</td>
                <td className="p-4 text-yellow-500 font-bold">{formatCurrency(m.takeRateRevenue)}</td>
                <td className="p-4 text-red-400/80">{formatCurrency(m.variableCosts)}</td>
                <td className="p-4 text-orange-400">{formatCurrency(m.marketing)}</td>
                <td className={`p-4 font-bold ${m.netProfit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                  {formatCurrency(m.netProfit)}
                </td>
                <td className="p-4 text-slate-400 text-xs">{m.margin.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialTable;
