import React from 'react';

export const DarkTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const items = payload.map((p: any) => {
    const name = p.name || p.dataKey;
    const val = p.value;
    let displayName = name;
    let displayValue: string | number = val;
    if (name?.toLowerCase().includes('ticket')) {
      displayName = 'Ticket médio';
      displayValue = typeof val === 'number' ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : val;
    } else if (name?.toLowerCase().includes('share')) {
      displayName = 'Market share';
      displayValue = `${Number(val).toFixed(1)}%`;
    } else if (name?.toLowerCase().includes('satisfação')) {
      displayName = 'Satisfação';
      displayValue = Number(val).toFixed(1);
    } else if (name?.toLowerCase().includes('receita') || name?.toLowerCase().includes('lucro')) {
      displayValue = typeof val === 'number' ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : val;
    }
    return { name: displayName, value: displayValue, color: p.stroke || p.fill || '#e5e7eb' };
  });
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-lg">
      <div className="text-[11px] font-bold text-slate-200 mb-1">{label}</div>
      <div className="space-y-1">
        {items.map((it: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: it.color }} />
              {it.name}
            </span>
            <span className="font-mono font-semibold">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NeutralLegend: React.FC<any> = ({ payload }) => {
  if (!payload || !payload.length) return null;
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
      {payload.map((item: any) => (
        <span key={item.value} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color || '#9ca3af' }} />
          <span className="font-semibold">{item.value}</span>
        </span>
      ))}
    </div>
  );
};
