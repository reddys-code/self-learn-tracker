import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';

const chartColors = ['#2e6ca5', '#1aa9a1', '#f0b13b', '#9a6ef3'];

function ChartCard({ title, children }) {
  return (
    <section className="panel-card chart-card">
      <div className="panel-head compact">
        <h3>{title}</h3>
      </div>
      <div className="chart-frame">{children}</div>
    </section>
  );
}

export function AdminProgressCharts({ overview }) {
  if (!overview) return null;

  const statusData = [
    { name: 'Complete', value: overview.aggregateStatusCounts.complete },
    { name: 'In Progress', value: overview.aggregateStatusCounts['in-progress'] },
    { name: 'Blocked', value: overview.aggregateStatusCounts.blocked },
    { name: 'Not Started', value: overview.aggregateStatusCounts['not-started'] },
  ];

  const userBars = overview.users.slice(0, 10).map((user) => ({
    name: user.name.length > 12 ? `${user.name.slice(0, 12)}…` : user.name,
    completionPct: user.completionPct,
  }));

  return (
    <div className="chart-grid admin-grid">
      <ChartCard title="Completion by learner">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={userBars}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="completionPct" radius={[6, 6, 0, 0]} fill="#2e6ca5" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Overall status mix">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={105} innerRadius={62}>
              {statusData.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Weekly completion trend">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={overview.weeklyProgress}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekNumber" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="percent" stroke="#1aa9a1" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Phase completion across active users">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={overview.phaseProgress} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="phaseLabel" width={130} />
            <Tooltip />
            <Bar dataKey="percent" radius={[0, 6, 6, 0]} fill="#f0b13b" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
