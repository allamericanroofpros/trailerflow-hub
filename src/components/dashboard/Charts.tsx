import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const revenueByType = [
  { type: "Festivals", revenue: 18400 },
  { type: "Corporate", revenue: 12200 },
  { type: "Weddings", revenue: 9800 },
  { type: "Markets", revenue: 7600 },
  { type: "Private", revenue: 5200 },
  { type: "School", revenue: 3100 },
];

const trailerPerformance = [
  { name: "Sweet Scoops", revenue: 24600, events: 18, utilization: 78 },
  { name: "Brew Mobile", revenue: 19200, events: 22, utilization: 85 },
  { name: "Kettle Kings", revenue: 15800, events: 14, utilization: 62 },
];

const COLORS = [
  "hsl(16, 65%, 48%)",
  "hsl(38, 85%, 52%)",
  "hsl(152, 55%, 42%)",
  "hsl(210, 70%, 52%)",
  "hsl(280, 50%, 55%)",
  "hsl(340, 60%, 52%)",
];

export function RevenueByTypeChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Revenue by Event Type</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={revenueByType} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 18%, 89%)" vertical={false} />
          <XAxis dataKey="type" tick={{ fontSize: 12, fill: "hsl(20, 10%, 48%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "hsl(20, 10%, 48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(30, 18%, 89%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
          />
          <Bar dataKey="revenue" fill="hsl(16, 65%, 48%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrailerPerformanceChart() {
  const pieData = trailerPerformance.map((t) => ({ name: t.name, value: t.revenue }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Trailer Performance</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(30, 18%, 89%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {trailerPerformance.map((t) => (
          <div key={t.name} className="text-center">
            <p className="text-xs text-muted-foreground">{t.name}</p>
            <p className="text-sm font-semibold text-card-foreground">{t.utilization}%</p>
            <p className="text-xs text-muted-foreground">utilization</p>
          </div>
        ))}
      </div>
    </div>
  );
}
