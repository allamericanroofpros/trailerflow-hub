import { AppLayout } from "@/components/layout/AppLayout";
import {
  DollarSign, TrendingUp, Plus, Loader2, ArrowUpRight, ArrowDownRight,
  Receipt, Lock, Sparkles, ArrowRight, CalendarDays, PieChart, Filter,
  Download, Truck, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
  Tooltip, PieChart as RPieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { useTransactions, useCreateTransaction } from "@/hooks/useTransactions";
import { useOrders } from "@/hooks/useOrders";
import { useTrailers } from "@/hooks/useTrailers";
import { useEvents } from "@/hooks/useEvents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgId } from "@/hooks/useOrgId";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useNavigate } from "react-router-dom";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const PERIOD_OPTIONS = [
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "This Month", value: "month" as const },
  { label: "All Time", value: "all" as const },
] as const;

const EXPENSE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--muted-foreground))",
];

export default function Financials() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: orders } = useOrders();
  const { data: trailers } = useTrailers();
  const { data: events } = useEvents();
  const createTx = useCreateTransaction();
  const { user } = useAuth();
  const orgId = useOrgId();
  const ent = useEntitlements();
  const { canManage } = useRoleAccess();
  const navigate = useNavigate();

  const [addingNew, setAddingNew] = useState(false);
  const [period, setPeriod] = useState<number | "month" | "all">(30);
  const [form, setForm] = useState({
    type: "income", amount: "", description: "", category: "", trailer_id: "", event_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });

  const resetForm = () => {
    setForm({ type: "income", amount: "", description: "", category: "", trailer_id: "", event_id: "", transaction_date: new Date().toISOString().split("T")[0] });
    setAddingNew(false);
  };

  const handleSave = () => {
    if (!form.amount) { toast.error("Amount is required"); return; }
    createTx.mutate({
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description || null,
      category: form.category || null,
      trailer_id: form.trailer_id || null,
      event_id: form.event_id || null,
      transaction_date: form.transaction_date,
      created_by: user?.id,
      org_id: orgId,
    }, {
      onSuccess: () => { resetForm(); toast.success("Transaction added"); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  // Filter transactions by period
  const filteredTx = useMemo(() => {
    if (!transactions?.length) return [];
    const now = new Date();
    if (period === "all") return transactions;
    let start: Date;
    if (period === "month") {
      start = startOfMonth(now);
    } else {
      start = subDays(now, period);
    }
    return transactions.filter(t => new Date(t.transaction_date) >= start);
  }, [transactions, period]);

  // Filter orders by period
  const filteredOrders = useMemo(() => {
    if (!orders?.length) return [];
    const now = new Date();
    if (period === "all") return orders;
    let start: Date;
    if (period === "month") {
      start = startOfMonth(now);
    } else {
      start = subDays(now, period);
    }
    return orders.filter(o => new Date(o.created_at) >= start);
  }, [orders, period]);

  const stats = useMemo(() => {
    const income = filteredTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const surchargeRevenue = filteredOrders.reduce((s, o: any) => s + (o.surcharge_amount || 0), 0);
    const orderRevenue = filteredOrders.reduce((s, o: any) => s + (o.total || 0), 0);
    const tipsCollected = filteredOrders.reduce((s, o: any) => s + (o.tip || 0), 0);
    const avgTicket = filteredOrders.length > 0 ? orderRevenue / filteredOrders.length : 0;
    const profitMargin = income > 0 ? ((income - expenses) / income * 100) : 0;

    return { totalIncome: income, totalExpenses: expenses, profit: income - expenses, count: filteredTx.length, surchargeRevenue, orderRevenue, tipsCollected, avgTicket, profitMargin, orderCount: filteredOrders.length };
  }, [filteredTx, filteredOrders]);

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTx.filter(t => t.type === "expense").forEach(t => {
      const cat = t.category || "Uncategorized";
      map[cat] = (map[cat] || 0) + t.amount;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [filteredTx]);

  // Income by category
  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTx.filter(t => t.type === "income").forEach(t => {
      const cat = t.category || "Sales";
      map[cat] = (map[cat] || 0) + t.amount;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [filteredTx]);

  // Revenue by trailer
  const revenueByTrailer = useMemo(() => {
    if (!trailers?.length) return [];
    const map: Record<string, { name: string; income: number; expenses: number }> = {};
    filteredTx.forEach(t => {
      const trailer = trailers.find(tr => tr.id === t.trailer_id);
      const name = trailer?.name || "Unassigned";
      if (!map[name]) map[name] = { name, income: 0, expenses: 0 };
      if (t.type === "income") map[name].income += t.amount;
      else map[name].expenses += t.amount;
    });
    return Object.values(map).sort((a, b) => b.income - a.income);
  }, [filteredTx, trailers]);

  // Event P&L
  const eventPnL = useMemo(() => {
    if (!events?.length) return [];
    const map: Record<string, { name: string; date: string; income: number; expenses: number; vendorFee: number }> = {};
    filteredTx.forEach(t => {
      if (!t.event_id) return;
      const event = events.find(e => e.id === t.event_id);
      if (!event) return;
      if (!map[t.event_id]) map[t.event_id] = { name: event.name, date: event.event_date || "", income: 0, expenses: 0, vendorFee: event.vendor_fee || 0 };
      if (t.type === "income") map[t.event_id].income += t.amount;
      else map[t.event_id].expenses += t.amount;
    });
    return Object.values(map).sort((a, b) => b.income - a.income);
  }, [filteredTx, events]);

  // Chart: monthly income vs expenses
  const chartData = useMemo(() => {
    if (!filteredTx.length) return [];
    const byMonth: Record<string, { month: string; income: number; expenses: number }> = {};
    filteredTx.forEach(t => {
      const d = new Date(t.transaction_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!byMonth[key]) byMonth[key] = { month: label, income: 0, expenses: 0 };
      if (t.type === "income") byMonth[key].income += t.amount;
      else byMonth[key].expenses += t.amount;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-12);
  }, [filteredTx]);

  // Daily revenue trend
  const dailyTrend = useMemo(() => {
    if (!filteredTx.length) return [];
    const byDay: Record<string, { date: string; net: number }> = {};
    filteredTx.forEach(t => {
      const key = t.transaction_date;
      if (!byDay[key]) byDay[key] = { date: key, net: 0 };
      byDay[key].net += t.type === "income" ? t.amount : -t.amount;
    });
    const sorted = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    return sorted.map(d => {
      cumulative += d.net;
      return { ...d, cumulative, label: format(new Date(d.date + "T12:00:00"), "MMM d") };
    });
  }, [filteredTx]);

  const periodLabel = typeof period === "number" ? `${period}d` : period === "month" ? "MTD" : "All";

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
            <p className="text-sm text-muted-foreground mt-1">Track income, expenses, and profitability.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === opt.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {canManage("financials") && (
              <Button size="sm" onClick={() => { resetForm(); setAddingNew(true); }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Transaction
              </Button>
            )}
          </div>
        </div>

        {/* Top-line Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Income", value: `$${stats.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: ArrowUpRight, color: "text-success" },
            { label: "Expenses", value: `$${stats.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: ArrowDownRight, color: "text-destructive" },
            { label: "Net Profit", value: `$${stats.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: stats.profit >= 0 ? "text-success" : "text-destructive" },
            { label: "Margin", value: stats.totalIncome > 0 ? `${stats.profitMargin.toFixed(1)}%` : "—", icon: PieChart, color: "text-primary" },
            { label: "Avg Ticket", value: stats.orderCount > 0 ? `$${stats.avgTicket.toFixed(0)}` : "—", icon: Receipt, color: "text-info" },
            { label: "Tips", value: `$${stats.tipsCollected.toFixed(0)}`, icon: DollarSign, color: "text-warning" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1.5">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add Form */}
        {addingNew && (
          <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Add Transaction</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Amount ($) *</label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. vendor fee, supplies, fuel" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Trailer</label>
                <select value={form.trailer_id} onChange={(e) => setForm({ ...form, trailer_id: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="">None</option>
                  {trailers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Event</label>
                <select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="">None</option>
                  {events?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleSave} disabled={createTx.isPending} className="gap-1.5">
                {createTx.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Charts Row — Income vs Expenses + Cumulative P&L */}
        {ent.advancedAnalytics ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chartData.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold text-card-foreground mb-4">Income vs Expenses</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {dailyTrend.length > 1 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold text-card-foreground mb-4">Cumulative Profit Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Cumulative P&L" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 shadow-card relative overflow-hidden">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Financial Trends & Analytics</h3>
            <div className="flex flex-col items-center justify-center h-[220px] text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Trend charts, expense breakdowns, and P&L analysis require the <span className="font-semibold text-foreground">Pro</span> plan.
              </p>
              <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => navigate("/settings?section=billing")}>
                <Sparkles className="h-3.5 w-3.5" /> Upgrade <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Expense Breakdown + Revenue by Trailer (Pro+) */}
        {ent.advancedAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense Breakdown Pie */}
            {expenseByCategory.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold text-card-foreground mb-4">Expense Breakdown</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RPieChart>
                    <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2} dataKey="value" nameKey="name">
                      {expenseByCategory.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, ""]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Revenue by Trailer */}
            {revenueByTrailer.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold text-card-foreground mb-4">Revenue by Trailer</h3>
                <div className="space-y-3">
                  {revenueByTrailer.map((t) => {
                    const net = t.income - t.expenses;
                    const maxVal = Math.max(...revenueByTrailer.map(r => r.income)) || 1;
                    return (
                      <div key={t.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium text-card-foreground">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-success">${t.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className={net >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                              Net: ${net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(t.income / maxVal) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event P&L Table (Pro+) */}
        {ent.advancedAnalytics && eventPnL.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">Event P&L Summary</h3>
              <span className="text-xs text-muted-foreground">{eventPnL.length} events with transactions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Event", "Date", "Income", "Expenses", "Vendor Fee", "Net Profit", "Margin"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventPnL.map((e) => {
                    const net = e.income - e.expenses - e.vendorFee;
                    const margin = e.income > 0 ? (net / e.income * 100) : 0;
                    return (
                      <tr key={e.name + e.date} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-card-foreground">{e.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.date ? format(new Date(e.date + "T12:00:00"), "MMM d, yyyy") : "—"}</td>
                        <td className="px-4 py-3 text-success">${e.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-destructive">${e.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-muted-foreground">${e.vendorFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className={`px-4 py-3 font-semibold ${net >= 0 ? "text-success" : "text-destructive"}`}>
                          ${net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-4 py-3 ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">All Transactions</h3>
            <span className="text-xs text-muted-foreground">{filteredTx.length} records ({periodLabel})</span>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredTx.length ? (
            <div className="py-12 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions for this period. Add your first transaction above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Date", "Type", "Description", "Category", "Event", "Trailer", "Amount"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((t: any) => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{t.transaction_date}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}>{t.type}</span>
                      </td>
                      <td className="px-4 py-3 text-card-foreground">{t.description || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.category || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.events?.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.trailers?.name || "—"}</td>
                      <td className={`px-4 py-3 font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                        {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
