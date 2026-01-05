import React from 'react';
import Layout from './components/Layout';
import { useViability } from './useViability'; // O arquivo que você acabou de criar

const App: React.FC = () => {
  const { activeTab, setActiveTab, params, projections, audits, updateParam } = useViability();

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">TKX FRANCA v.4.0</h1>
        <p className="mt-4">Dashboard organizado e pronto para expansão.</p>
        
        {/* Aqui você pode colar aos poucos as partes visuais de cada aba */}
        <div className="mt-8 bg-slate-800 p-4 rounded">
          <p>Motoristas Ativos: {params.activeDrivers}</p>
          <p>Receita Estimada: R$ {projections[0].grossRevenue.toLocaleString()}</p>
        </div>
      </div>
    </Layout>
  );
};

export default App;
