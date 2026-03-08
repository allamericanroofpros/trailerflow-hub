import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useEvents } from "@/hooks/useEvents";
import { useTrailers } from "@/hooks/useTrailers";
import { useOrders } from "@/hooks/useOrders";
import { useMemo } from "react";

const COLORS = [
  "hsl(16, 65%, 48%)",
  "hsl(38, 85%, 52%)",
  "hsl(152, 55%, 42%)",
  "hsl(210, 70%, 52%)",
  "hsl(280, 50%, 55%)",
  "hsl(340, 60%, 52%)",
];

export function RevenueByTypeChart() {
  const { data: events } = useEvents();

  const chartData = useMemo(() => {
    if (!events?.length) return [];
    const byType: Record<string, number> = {};
    events.forEach((e) => {
      const type = e.event_type || "Other";
      byType[type] = (byType[type] || 0) + (e.actual_revenue || 0);
    });
    return Object.entries(byType)
      .map(([type, revenue]) => ({ type, revenue }))
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [events]);

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Revenue by Event Type</h3>
        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
          No revenue data yet. Complete events and log revenue to see charts.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Revenue by Event Type</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="type" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
          />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrailerPerformanceChart() {
  const { data: trailers } = useTrailers();
  const { data: events } = useEvents();

  const { pieData, stats } = useMemo(() => {
    if (!trailers?.length || !events?.length) return { pieData: [], stats: [] };

    const trailerRevenue: Record<string, { name: string; revenue: number; eventCount: number }> = {};
    trailers.forEach(t => {
      trailerRevenue[t.id] = { name: t.name, revenue: 0, eventCount: 0 };
    });

    events.forEach(e => {
      if (e.trailer_id && trailerRevenue[e.trailer_id]) {
        trailerRevenue[e.trailer_id].revenue += e.actual_revenue || 0;
        trailerRevenue[e.trailer_id].eventCount += 1;
      }
    });

    const entries = Object.values(trailerRevenue).filter(t => t.revenue > 0 || t.eventCount > 0);
    return {
      pieData: entries.map(t => ({ name: t.name, value: t.revenue || 1 })),
      stats: entries.map(t => ({ name: t.name, events: t.eventCount, revenue: t.revenue })),
    };
  }, [trailers, events]);

  if (!pieData.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Trailer Performance</h3>
        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
          No trailer performance data yet. Assign trailers to events to see stats.
        </div>
      </div>
    );
  }

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
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.slice(0, 3).map((t) => (
          <div key={t.name} className="text-center">
            <p className="text-xs text-muted-foreground truncate">{t.name}</p>
            <p className="text-sm font-semibold text-card-foreground">{t.events}</p>
            <p className="text-xs text-muted-foreground">events</p>
          </div>
        ))}
      </div>
    </div>
  );
}
