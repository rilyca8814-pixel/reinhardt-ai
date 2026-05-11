import { useState } from 'react';
import TabNavigation from './components/TabNavigation';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Aportes from './pages/Aportes';
import Renda from './pages/Renda';
import Metas from './pages/Metas';
import AIChat from './pages/AIChat';
import Alertas from './pages/Alertas';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analise', label: 'Análise' },
  { id: 'aportes', label: 'Aportes' },
  { id: 'renda', label: 'Renda' },
  { id: 'metas', label: 'Metas' },
  { id: 'ai-chat', label: 'AI Chat' },
  { id: 'alertas', label: 'Alertas' }
];

const pages = {
  dashboard: <Dashboard />,
  analise: <Analysis />,
  aportes: <Aportes />,
  renda: <Renda />,
  metas: <Metas />,
  'ai-chat': <AIChat />,
  alertas: <Alertas />
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Reinhardt AI</h1>
          <p>Dashboard de investimentos brasileiros com análise e alertas inteligentes.</p>
        </div>
      </header>

      <TabNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <main className="app-content">{pages[activeTab]}</main>
    </div>
  );
}

export default App;
