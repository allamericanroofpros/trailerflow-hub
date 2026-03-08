import { AppLayout } from "@/components/layout/AppLayout";
import { DollarSign, TrendingUp, Truck, Plus, Loader2, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { useTransactions, useCreateTransaction } from "@/hooks/useTransactions";
import { useOrders } from "@/hooks/useOrders";
import { useTrailers } from "@/hooks/useTrailers";
import { useEvents } from "@/hooks/useEvents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgId } from "@/hooks/useOrgId";

export default function Financials() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: orders } = useOrders();
  const { data: trailers } = useTrailers();
  const { data: events } = useEvents();
  const createTx = useCreateTransaction();
  const { user } = useAuth();
  const orgId = useOrgId();

  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState({
    type: "income", amount: "", description: "", category: "", trailer_id: "", event_id: "", transaction_date: new Date().toISOString().split("T")[0],
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

  const stats = useMemo(() => {
    if (!transactions?.length) return { totalIncome: 0, totalExpenses: 0, profit: 0, count: 0, surchargeRevenue: 0 };
    const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const surchargeRevenue = (orders || []).reduce((s, o: any) => s + (o.surcharge_amount || 0), 0);
    return { totalIncome: income, totalExpenses: expenses, profit: income - expenses, count: transactions.length, surchargeRevenue };
  }, [transactions, orders]);

  // Chart: monthly income vs expenses
  const chartData = useMemo(() => {
    if (!transactions?.length) return [];
    const byMonth: Record<string, { month: string; income: number; expenses: number }> = {};
    transactions.forEach(t => {
      const d = new Date(t.transaction_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!byMonth[key]) byMonth[key] = { month: label, income: 0, expenses: 0 };
      if (t.type === "income") byMonth[key].income += t.amount;
      else byMonth[key].expenses += t.amount;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-6);
  }, [transactions]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
            <p className="text-sm text-muted-foreground mt-1">Track income, expenses, and profitability.</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setAddingNew(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Transaction
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Income", value: `$${stats.totalIncome.toLocaleString()}`, icon: ArrowUpRight, color: "text-success" },
            { label: "Total Expenses", value: `$${stats.totalExpenses.toLocaleString()}`, icon: ArrowDownRight, color: "text-destructive" },
            { label: "Net Profit", value: `$${stats.profit.toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
            { label: "Surcharge Revenue", value: `$${stats.surchargeRevenue.toFixed(2)}`, icon: Receipt, color: "text-amber-600" },
            { label: "Transactions", value: stats.count.toString(), icon: DollarSign, color: "text-info" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
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

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={24}>
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

        {/* Transactions Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">All Transactions</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !transactions?.length ? (
            <div className="py-12 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet. Add your first transaction above.</p>
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
                  {transactions.map((t: any) => (
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
