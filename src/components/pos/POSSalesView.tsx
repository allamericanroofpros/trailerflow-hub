import { useMemo, forwardRef } from "react";
import { useOrders } from "@/hooks/useOrders";
import {
  DollarSign, TrendingUp, Receipt, CreditCard, Banknote,
  Smartphone, Clock, Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const POSSalesView = forwardRef<HTMLDivElement>(function POSSalesView(_props, ref) {
  const { data: orders, isLoading } = useOrders();

  const todayStats = useMemo(() => {
    if (!orders) return null;
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelled"
    );

    const totalRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalTax = todayOrders.reduce((s, o) => s + Number(o.tax), 0);
    const totalTips = todayOrders.reduce((s, o) => s + Number(o.tip || 0), 0);
    const avgTicket = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

    const byPayment: Record<string, { count: number; total: number }> = {};
    todayOrders.forEach((o) => {
      const m = o.payment_method || "other";
      if (!byPayment[m]) byPayment[m] = { count: 0, total: 0 };
      byPayment[m].count++;
      byPayment[m].total += Number(o.total);
    });

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
    const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    return { todayOrders, totalRevenue, totalTax, totalTips, avgTicket, byPayment, hourlyData, topItems };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-3" /> Loading sales data...
      </div>
    );
  }

  if (!todayStats) return null;

  const paymentIcons: Record<string, React.ReactNode> = {
    cash: <Banknote className="h-5 w-5" />,
    card: <CreditCard className="h-5 w-5" />,
    digital: <Smartphone className="h-5 w-5" />,
    other: <DollarSign className="h-5 w-5" />,
  };

  const currentHour = new Date().getHours();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today's Revenue", value: `$${todayStats.totalRevenue.toFixed(2)}`, icon: DollarSign, accent: "text-primary" },
          { label: "Orders", value: todayStats.todayOrders.length.toString(), icon: Receipt, accent: "text-primary" },
          { label: "Avg Ticket", value: `$${todayStats.avgTicket.toFixed(2)}`, icon: TrendingUp, accent: "text-primary" },
          { label: "Tips", value: `$${todayStats.totalTips.toFixed(2)}`, icon: DollarSign, accent: "text-success" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-card-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Hourly Sales Chart */}
      {todayStats.hourlyData.length > 0 && (
        <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">Hourly Sales</h3>
          <div className="h-48 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={todayStats.hourlyData}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={50} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                  contentStyle={{ borderRadius: 12, border: "2px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13, fontWeight: 700 }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {todayStats.hourlyData.map((entry) => (
                    <Cell
                      key={entry.hour}
                      fill={entry.hour === currentHour ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Breakdown */}
        <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {Object.entries(todayStats.byPayment).map(([method, data]) => (
              <div key={method} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  {paymentIcons[method] || paymentIcons.other}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-card-foreground capitalize">{method}</p>
                  <p className="text-xs text-muted-foreground">{data.count} orders</p>
                </div>
                <p className="text-base font-black text-card-foreground">${data.total.toFixed(2)}</p>
              </div>
            ))}
            {Object.keys(todayStats.byPayment).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No sales yet today</p>
            )}
          </div>
        </div>

        {/* Top Items */}
        <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">Top Items</h3>
          <div className="space-y-3">
            {todayStats.topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-card-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.qty} sold</p>
                </div>
                <p className="text-base font-black text-card-foreground">${item.revenue.toFixed(2)}</p>
              </div>
            ))}
            {todayStats.topItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No items sold yet today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default POSSalesView;
