
import { LayoutDashboard, TrendingUp, Map as MapIcon, Sliders, FileText, Users, PieChart, Briefcase, BarChart3, Target, UserCheck, Download, Printer, Megaphone, Zap, Save, Trash2 } from 'lucide-react';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: number;
  setActiveTab: (tab: number) => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onOpenSnapshots?: () => void;
  onClearParams?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onExportPDF, onExportExcel, onOpenSnapshots, onClearParams }) => {
  const tabs = [
    { id: 0, label: 'CALOR / DEMANDA', icon: <MapIcon size={22} /> },
    { id: 1, label: 'BENCH / MARKET SHARE', icon: <Users size={22} /> },
    { id: 2, label: 'MKT/CF', icon: <Megaphone size={22} /> },
    { id: 15, label: 'PROJEÇÕES DE FESTAS/EVENTOS', icon: <Zap size={22} /> },
    { id: 3, label: 'PARAMETRIZAÇÃO', icon: <Sliders size={22} /> },
    { id: 4, label: 'DRIVERS/ ESCALA', icon: <UserCheck size={22} /> },
    { id: 5, label: 'PROJEÇÕES/ ESCALA', icon: <TrendingUp size={22} /> },
    { id: 6, label: '36 meses', icon: <PieChart size={22} /> },
    { id: 7, label: 'DRE', icon: <FileText size={22} /> },
    { id: 8, label: 'kpis', icon: <BarChart3 size={22} /> },
    { id: 9, label: 'Cenários', icon: <Target size={22} /> },
    { id: 10, label: 'Geral', icon: <LayoutDashboard size={22} /> },
    { id: 11, label: 'VISÃO 360º', icon: <Briefcase size={22} /> },
    { id: 12, label: 'RESUMO EXECUTIVO', icon: <Zap size={22} /> },
    { id: 13, label: 'COMPARAR', icon: <BarChart3 size={22} /> },
    { id: 14, label: 'TENDÊNCIAS', icon: <TrendingUp size={22} /> },
    { id: 16, label: 'INPUTS ESTRATÉGICOS', icon: <Target size={22} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden flex-col">
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-2xl no-print">
        <header className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
                <div className="flex items-center leading-none">
                  <span className="text-white text-3xl font-black lowercase tracking-tighter">tk</span>
                  <span className="text-yellow-500 text-3xl font-black lowercase italic ml-[-2px] drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">x</span>
                  <div className="ml-3 h-6 w-[2px] bg-slate-800 hidden sm:block"></div>
                  <span className="text-white text-xl font-black uppercase ml-0 sm:ml-3 tracking-tighter opacity-90">Franca</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[7px] text-slate-500 uppercase font-black tracking-[0.25em]">Mobilidade Inteligente</span>
                  <span className="text-[7px] text-yellow-500/50 font-black uppercase tracking-widest">• CFO Platform</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800 mr-2">
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); onOpenSnapshots?.(); }}
                title="Gerenciar Snapshots (Histórico)"
                className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <Save size={16} />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-1"></div>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); onExportPDF?.(); }}
                title="Exportar PDF / Imprimir"
                className="p-2 text-slate-400 hover:text-yellow-500 transition-colors"
              >
                <Printer size={16} />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-1"></div>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); onExportExcel?.(); }}
                title="Exportar Excel (XLSX)"
                className="p-2 text-slate-400 hover:text-green-500 transition-colors"
              >
                <Download size={16} />
              </button>
              {onClearParams && (
                <>
                  <div className="w-px h-4 bg-slate-800 mx-1"></div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onClearParams?.(); }}
                    title="Limpar parâmetros salvos e recarregar"
                    className="p-2 text-slate-400 hover:text-yellow-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
            <div className="bg-yellow-500 text-slate-950 px-3 py-1 rounded-md text-[10px] font-black uppercase shadow-[0_0_15px_rgba(234,179,8,0.4)]">
              {tabs.find(t => t.id === activeTab)?.label}
            </div>
          </div>
        </header>

        <nav className="flex overflow-x-auto no-scrollbar border-t border-slate-800/50 bg-slate-900/50">
          <div className="flex px-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  document.querySelector('main')?.scrollTo(0, 0);
                }}
                className={`flex flex-col items-center justify-center min-w-[130px] h-16 transition-all relative ${
                  activeTab === tab.id ? 'text-yellow-500 bg-slate-800/40' : 'text-slate-500'
                }`}
              >
                <div className={`${activeTab === tab.id ? 'scale-110 mb-0.5' : 'scale-90 opacity-60'}`}>
                  {tab.icon}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-tighter leading-tight ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 w-full h-1 bg-yellow-500 shadow-[0_0_10px_#EAB308]" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>
      
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950 relative scroll-smooth">
        <div className="p-3 w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
