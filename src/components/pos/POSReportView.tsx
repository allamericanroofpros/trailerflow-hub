import { useMemo, forwardRef } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useInventoryLogs } from "@/hooks/useInventory";
import {
  DollarSign, TrendingUp, TrendingDown, Clock, Receipt,
  Loader2, Package, Users,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const POSReportView = forwardRef<HTMLDivElement>(function POSReportView(_props, ref) {
  const { data: orders, isLoading } = useOrders();
  const { data: logs } = useInventoryLogs();

  const report = useMemo(() => {
    if (!orders) return null;
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelled"
    );
    const cancelledToday = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today && o.status === "cancelled"
    );

    const grossRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalTax = todayOrders.reduce((s, o) => s + Number(o.tax), 0);
    const netRevenue = grossRevenue - totalTax;
    const totalTips = todayOrders.reduce((s, o) => s + Number(o.tip || 0), 0);
    const avgTicket = todayOrders.length > 0 ? grossRevenue / todayOrders.length : 0;
    const orderCount = todayOrders.length;

    // Items sold
    let totalItemsSold = 0;
    const itemSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    todayOrders.forEach((o) => {
      ((o as any).order_items || []).forEach((item: any) => {
        const name = item.menu_items?.name || "Unknown";
        totalItemsSold += item.quantity;
        if (!itemSales[name]) itemSales[name] = { name, qty: 0, revenue: 0 };
        itemSales[name].qty += item.quantity;
        itemSales[name].revenue += Number(item.unit_price) * item.quantity;
      });
    });
    const topItems = Object.values(itemSales).sort((a, b) => b.qty - a.qty);

    // Payment pie
    const paymentBreakdown: { name: string; value: number }[] = [];
    const paymentMap: Record<string, number> = {};
    todayOrders.forEach((o) => {
      const m = o.payment_method || "other";
      paymentMap[m] = (paymentMap[m] || 0) + Number(o.total);
    });
    Object.entries(paymentMap).forEach(([name, value]) => paymentBreakdown.push({ name, value }));

    // Inventory usage today
    const todayLogs = (logs || []).filter(
      (l) => new Date(l.created_at).toDateString() === today && Number(l.change_amount) < 0
    );
    const inventoryCost = todayLogs.reduce((s, l) => s + Math.abs(Number(l.change_amount)), 0);

    // Time metrics
    const firstOrder = todayOrders.length > 0
      ? new Date(todayOrders[todayOrders.length - 1].created_at)
      : null;
    const lastOrder = todayOrders.length > 0
      ? new Date(todayOrders[0].created_at)
      : null;
    const hoursActive = firstOrder && lastOrder
      ? Math.max(1, (lastOrder.getTime() - firstOrder.getTime()) / 3600000)
      : 0;
    const revenuePerHour = hoursActive > 0 ? grossRevenue / hoursActive : 0;

    return {
      grossRevenue, netRevenue, totalTax, totalTips, avgTicket,
      orderCount, cancelledCount: cancelledToday.length, totalItemsSold,
      topItems, paymentBreakdown, inventoryCost,
      firstOrder, lastOrder, hoursActive, revenuePerHour,
    };
  }, [orders, logs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-3" /> Loading report...
      </div>
    );
  }

  if (!report) return null;

  const PIE_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent-foreground))",
    "hsl(var(--muted-foreground))",
    "hsl(var(--destructive))",
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Daily Report</h2>
          <p className="text-sm text-muted-foreground font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        {report.firstOrder && report.lastOrder && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-semibold">Active Hours</p>
            <p className="text-lg font-black text-card-foreground">
              {report.firstOrder.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              {" – "}
              {report.lastOrder.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Gross Revenue", value: `$${report.grossRevenue.toFixed(2)}`, icon: DollarSign, accent: "text-primary" },
          { label: "Net Revenue", value: `$${report.netRevenue.toFixed(2)}`, icon: TrendingUp, accent: "text-success" },
          { label: "Rev / Hour", value: `$${report.revenuePerHour.toFixed(0)}`, icon: Clock, accent: "text-primary" },
          { label: "Avg Ticket", value: `$${report.avgTicket.toFixed(2)}`, icon: Receipt, accent: "text-primary" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border-2 border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className="text-2xl font-black text-card-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Orders", value: report.orderCount },
          { label: "Items Sold", value: report.totalItemsSold },
          { label: "Tips Collected", value: `$${report.totalTips.toFixed(2)}` },
          { label: "Tax Collected", value: `$${report.totalTax.toFixed(2)}` },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border-2 border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
            <p className="text-xl font-black text-card-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Pie */}
        {report.paymentBreakdown.length > 0 && (
          <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Payment Split</h3>
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={report.paymentBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3}>
                      {report.paymentBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {report.paymentBreakdown.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm font-bold text-card-foreground capitalize flex-1">{p.name}</span>
                    <span className="text-sm font-black text-card-foreground">${p.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Item Performance */}
        <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Item Performance</h3>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {report.topItems.map((item, i) => {
              const maxQty = report.topItems[0]?.qty || 1;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-card-foreground truncate flex-1">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.qty} sold</span>
                    <span className="text-sm font-black text-card-foreground ml-3">${item.revenue.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(item.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {report.topItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No items sold yet today</p>
            )}
          </div>
        </div>
      </div>

      {/* Cancelled orders note */}
      {report.cancelledCount > 0 && (
        <div className="rounded-2xl border-2 border-warning/30 bg-warning/5 p-4 flex items-center gap-3">
          <TrendingDown className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm font-bold text-warning">
            {report.cancelledCount} cancelled order{report.cancelledCount > 1 ? "s" : ""} today
          </p>
        </div>
      )}
    </div>
  );
}
