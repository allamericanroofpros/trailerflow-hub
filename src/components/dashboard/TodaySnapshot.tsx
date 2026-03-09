import { useMemo } from "react";
import { useOrders } from "@/hooks/useOrders";
import {
  DollarSign, Receipt, TrendingUp, Clock, Banknote, CreditCard,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/** Today's at-a-glance snapshot for the operator dashboard */
export function TodaySnapshot() {
  const { data: orders } = useOrders();

  const stats = useMemo(() => {
    if (!orders) return null;
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelled"
    );

    const totalRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalTips = todayOrders.reduce((s, o) => s + Number(o.tip || 0), 0);
    const avgTicket = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

    // Top items
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    todayOrders.forEach((o) => {
      ((o as any).order_items || []).forEach((item: any) => {
        const name = item.menu_items?.name || "Unknown";
        if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 };
        itemMap[name].qty += item.quantity;
        itemMap[name].revenue += Number(item.unit_price) * item.quantity;
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Hourly breakdown
    const hourly: Record<number, number> = {};
    todayOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      hourly[h] = (hourly[h] || 0) + Number(o.total);
    });
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`,
      revenue: hourly[i] || 0,
    })).filter((h) => h.revenue > 0 || (h.hour >= 8 && h.hour <= 22));

    // Find peak hour
    const peakHour = hourlyData.reduce((max, h) => h.revenue > max.revenue ? h : max, { hour: 0, label: "", revenue: 0 });

    // Cash vs Card
    const cashOrders = todayOrders.filter(o => o.payment_method === "cash");
    const cardOrders = todayOrders.filter(o => o.payment_method === "card" || o.payment_method === "digital");
    const cashTotal = cashOrders.reduce((s, o) => s + Number(o.total), 0);
    const cardTotal = cardOrders.reduce((s, o) => s + Number(o.total), 0);

    return { totalRevenue, orderCount: todayOrders.length, avgTicket, totalTips, topItems, hourlyData, peakHour, cashTotal, cardTotal, cashCount: cashOrders.length, cardCount: cardOrders.length };
  }, [orders]);

  if (!stats) return null;

  const currentHour = new Date().getHours();
  const hasData = stats.orderCount > 0;

  const kpis = [
    { label: "Today's Sales", value: `$${stats.totalRevenue.toFixed(0)}`, icon: DollarSign, accent: "text-primary" },
    { label: "Orders", value: stats.orderCount.toString(), icon: Receipt, accent: "text-primary" },
    { label: "Avg Ticket", value: `$${stats.avgTicket.toFixed(0)}`, icon: TrendingUp, accent: "text-primary" },
    { label: "Tips", value: `$${stats.totalTips.toFixed(0)}`, icon: DollarSign, accent: "text-success" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today at a Glance</h2>
        {hasData && stats.peakHour.revenue > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Peak: {stats.peakHour.label}
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className="text-2xl font-black text-card-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Busy hours + Top items side by side on desktop, stacked on mobile */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Busy Hours Heatmap */}
          {stats.hourlyData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Busy Hours</h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hourlyData}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(0)}`, "Revenue"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {stats.hourlyData.map((entry) => (
                        <Cell
                          key={entry.hour}
                          fill={entry.hour === currentHour ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.25)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Items */}
          {stats.topItems.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Top Sellers</h3>
              <div className="space-y-2.5">
                {stats.topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-card-foreground flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.qty} sold</span>
                    <span className="text-sm font-bold text-card-foreground">${item.revenue.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cash vs Card */}
      {hasData && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-4 w-4 text-success" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cash</span>
            </div>
            <p className="text-xl font-black text-card-foreground">${stats.cashTotal.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">{stats.cashCount} orders</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Card / Digital</span>
            </div>
            <p className="text-xl font-black text-card-foreground">${stats.cardTotal.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">{stats.cardCount} orders</p>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">No sales yet today. Hit <strong>"Open for Business"</strong> to start selling!</p>
        </div>
      )}
    </div>
  );
}
