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
} from 'recharts';

const chartColors = ['#2e6ca5', '#1aa9a1', '#f0b13b', '#9a6ef3'];

function SummaryChartCard({ title, children }) {
  return (
    <section className="panel-card chart-card">
      <div className="panel-head compact">
        <h3>{title}</h3>
      </div>
      <div className="chart-frame">{children}</div>
    </section>
  );
}

export function UserProgressCharts({ summary }) {
  if (!summary) return null;

  const statusData = [
    { name: 'Complete', value: summary.statusCounts.complete },
    { name: 'In Progress', value: summary.statusCounts['in-progress'] },
    { name: 'Blocked', value: summary.statusCounts.blocked },
    { name: 'Not Started', value: summary.statusCounts['not-started'] },
  ];

  return (
    <div className="chart-grid">
      <SummaryChartCard title="Status distribution">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={58} paddingAngle={3}>
              {statusData.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </SummaryChartCard>

      <SummaryChartCard title="Week-by-week completion">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={summary.weeklyProgress}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekNumber" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="percent" radius={[6, 6, 0, 0]} fill="#2e6ca5" />
          </BarChart>
        </ResponsiveContainer>
      </SummaryChartCard>

      <SummaryChartCard title="Phase progress">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={summary.phaseProgress} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="phaseLabel" type="category" width={130} />
            <Tooltip />
            <Bar dataKey="percent" radius={[0, 6, 6, 0]} fill="#1aa9a1" />
          </BarChart>
        </ResponsiveContainer>
      </SummaryChartCard>
    </div>
  );
}
