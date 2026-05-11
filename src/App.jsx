import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const tabs = ['Dashboard', 'Análise', 'Aportes', 'Renda', 'Metas', 'AI Chat', 'Alertas'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const initialPortfolio = { VTI: 246.89, QQQM: 90.42, IBIT: 52.79, Cash: 21.57 };
const exchangeRate = 5.85;

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'USD');
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [total, setTotal] = useState(411.67);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [alerts, setAlerts] = useState(['Alerta de exemplo']);

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#121212' : '#ffffff';
    document.body.style.color = theme === 'dark' ? '#ffffff' : '#000000';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPortfolio(prev => {
        const newPort = { ...prev };
        Object.keys(newPort).forEach(key => {
          newPort[key] += (Math.random() - 0.5) * 10;
        });
        const newTotal = Object.values(newPort).reduce((a, b) => a + b, 0);
        setTotal(newTotal);
        return newPort;
      });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const toggleCurrency = () => setCurrency(currency === 'USD' ? 'BRL' : 'USD');
  const convert = (val) => currency === 'BRL' ? val * exchangeRate : val;
  const data = Object.entries(portfolio).map(([name, value]) => ({ name, value: convert(value) }));

  const sendChat = async () => {
    if (!chatInput) return;
    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput }),
      });
      const data = await res.json();
      setChatMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setChatMessages([...newMessages, { role: 'assistant', content: 'Erro ao conectar.' }]);
    }
  };

  const sendTelegramAlert = () => {
    alert('Alerta enviado para Telegram!');
  };

  const requestNotification = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Reinhardt AI', { body: 'Notificação ativada!' });
        }
      });
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div>
            <h2>Dashboard</h2>
            <p>Total: {convert(total).toFixed(2)} {currency}</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      case 'Análise':
        return (
          <div>
            <h2>Análise</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[{ name: 'Jan', value: 400 }, { name: 'Feb', value: 300 }, { name: 'Mar', value: 500 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      case 'Aportes':
        return <div><h2>Aportes</h2><p>Histórico de aportes</p></div>;
      case 'Renda':
        return <div><h2>Renda</h2><p>Renda gerada</p></div>;
      case 'Metas':
        return <div><h2>Metas</h2><p>Metas de investimento</p></div>;
      case 'AI Chat':
        return (
          <div>
            <h2>AI Chat</h2>
            <div style={{ height: 300, overflowY: 'scroll', border: '1px solid', marginBottom: 10 }}>
              {chatMessages.map((msg, i) => <p key={i}><strong>{msg.role}:</strong> {msg.content}</p>)}
            </div>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} style={{ width: '80%' }} />
            <button onClick={sendChat}>Enviar</button>
          </div>
        );
      case 'Alertas':
        return (
          <div>
            <h2>Alertas</h2>
            <button onClick={sendTelegramAlert}>Enviar Alerta Telegram</button>
            <button onClick={requestNotification}>Ativar Notificações</button>
            <ul>
              {alerts.map((alert, i) => <li key={i}>{alert}</li>)}
            </ul>
          </div>
        );
      default:
        return <div>Tab não encontrado</div>;
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Reinhardt AI</h1>
      <button onClick={toggleTheme}>Tema: {theme}</button>
      <button onClick={toggleCurrency}>Moeda: {currency}</button>
      <div style={{ marginTop: 20 }}>
        {tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} style={{ marginRight: 10 }}>{tab}</button>)}
      </div>
      <div style={{ marginTop: 20 }}>
        {renderTab()}
      </div>
    </div>
  );
}

export default App;
