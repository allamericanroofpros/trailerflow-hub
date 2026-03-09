import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";

export default function AdminAnalytics() {
  const { data: orgs } = useQuery({
    queryKey: ["admin_analytics_orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("created_at").order("created_at");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin_analytics_profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("created_at").order("created_at");
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin_analytics_orders"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from("orders").select("created_at, total").gte("created_at", since).order("created_at");
      return data || [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["admin_analytics_transactions"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from("transactions").select("amount, type, transaction_date").gte("transaction_date", since.slice(0, 10));
      return data || [];
    },
  });

  const last30Days = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }), []);

  const orgGrowth = useMemo(() => {
    if (!orgs) return [];
    let cumulative = 0;
    const byDay: Record<string, number> = {};
    orgs.forEach(o => {
      const day = format(new Date(o.created_at), "yyyy-MM-dd");
      byDay[day] = (byDay[day] || 0) + 1;
    });
    const windowStart = format(last30Days[0], "yyyy-MM-dd");
    orgs.forEach(o => {
      if (format(new Date(o.created_at), "yyyy-MM-dd") < windowStart) cumulative++;
    });
    return last30Days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      cumulative += byDay[key] || 0;
      return { date: format(d, "MMM d"), count: cumulative };
    });
  }, [orgs, last30Days]);

  const userGrowth = useMemo(() => {
    if (!profiles) return [];
    let cumulative = 0;
    const byDay: Record<string, number> = {};
    profiles.forEach(p => {
      const day = format(new Date(p.created_at), "yyyy-MM-dd");
      byDay[day] = (byDay[day] || 0) + 1;
    });
    const windowStart = format(last30Days[0], "yyyy-MM-dd");
    profiles.forEach(p => {
      if (format(new Date(p.created_at), "yyyy-MM-dd") < windowStart) cumulative++;
    });
    return last30Days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      cumulative += byDay[key] || 0;
      return { date: format(d, "MMM d"), count: cumulative };
    });
  }, [profiles, last30Days]);

  const orderVolume = useMemo(() => {
    if (!orders) return [];
    const byDay: Record<string, { count: number; revenue: number }> = {};
    orders.forEach(o => {
      const day = format(new Date(o.created_at), "yyyy-MM-dd");
      if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 };
      byDay[day].count++;
      byDay[day].revenue += Number(o.total) || 0;
    });
    return last30Days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      return { date: format(d, "MMM d"), orders: byDay[key]?.count || 0, revenue: byDay[key]?.revenue || 0 };
    });
  }, [orders, last30Days]);

  const revenueData = useMemo(() => {
    if (!transactions) return [];
    const byDay: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const day = t.transaction_date;
      if (!byDay[day]) byDay[day] = { income: 0, expense: 0 };
      if (t.type === "income") byDay[day].income += Number(t.amount) || 0;
      else byDay[day].expense += Math.abs(Number(t.amount) || 0);
    });
    return last30Days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      return { date: format(d, "MMM d"), income: byDay[key]?.income || 0, expense: byDay[key]?.expense || 0 };
    });
  }, [transactions, last30Days]);

  const tooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" };
  const chartStyle = "rounded-xl border border-border bg-card p-4 sm:p-6";

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Last 30 days across all organizations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Org Growth */}
          <div className={chartStyle}>
            <h3 className="text-sm font-semibold mb-4">Organization Growth</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={orgGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Total Orgs" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Growth */}
          <div className={chartStyle}>
            <h3 className="text-sm font-semibold mb-4">User Growth</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--info))" fill="hsl(var(--info) / 0.15)" strokeWidth={2} name="Total Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Volume */}
          <div className={chartStyle}>
            <h3 className="text-sm font-semibold mb-4">Daily Order Volume</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderVolume}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue */}
          <div className={chartStyle}>
            <h3 className="text-sm font-semibold mb-4">Daily Revenue vs Expenses</h3>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
