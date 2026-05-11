import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Ações', value: 56 },
  { name: 'Renda Fixa', value: 28 },
  { name: 'Cripto', value: 10 },
  { name: 'FIIs', value: 6 }
];

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

function Dashboard() {
  return (
    <section className="page-page">
      <h2>Dashboard</h2>
      <p>Visão geral do portfólio e distribuição de ativos.</p>

      <div className="card-grid">
        <div className="card">
          <h3>Resumo do portfólio</h3>
          <p>Valor total investido: R$ 184.000</p>
          <p>Rentabilidade média: 14%</p>
          <p>Aportes mensais recomendados: R$ 2.500</p>
        </div>

        <div className="card chart-card">
          <h3>Distribuição de ativos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
