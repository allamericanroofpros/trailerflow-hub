import { AppLayout } from "@/components/layout/AppLayout";
import { DollarSign, Clock, TrendingUp, Truck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, LineChart, Line, Legend } from "recharts";

const eventPL = [
  { event: "Founders Day", revenue: 5200, costs: 2100, profit: 3100, hours: 10, revPerHr: 520, profitPerHr: 310 },
  { event: "Wedding Expo", revenue: 3100, costs: 1400, profit: 1700, hours: 6, revPerHr: 517, profitPerHr: 283 },
  { event: "Downtown Market", revenue: 1800, costs: 800, profit: 1000, hours: 5, revPerHr: 360, profitPerHr: 200 },
  { event: "Art Walk", revenue: 1400, costs: 700, profit: 700, hours: 4, revPerHr: 350, profitPerHr: 175 },
  { event: "Tech Lunch", revenue: 1200, costs: 500, profit: 700, hours: 3, revPerHr: 400, profitPerHr: 233 },
];

const trailerComparison = [
  { month: "Oct", "Sweet Scoops": 3200, "Brew Mobile": 2900, "Kettle Kings": 2200 },
  { month: "Nov", "Sweet Scoops": 2800, "Brew Mobile": 3200, "Kettle Kings": 2600 },
  { month: "Dec", "Sweet Scoops": 4100, "Brew Mobile": 2600, "Kettle Kings": 3100 },
  { month: "Jan", "Sweet Scoops": 3600, "Brew Mobile": 3100, "Kettle Kings": 2400 },
  { month: "Feb", "Sweet Scoops": 4800, "Brew Mobile": 3800, "Kettle Kings": 2800 },
];

export default function Financials() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
          <p className="text-sm text-muted-foreground mt-1">Event-level profitability and fleet comparison.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue (6mo)", value: "$59,600", icon: DollarSign },
            { label: "Total Profit", value: "$22,700", icon: TrendingUp },
            { label: "Avg Rev/Hour", value: "$429", icon: Clock },
            { label: "Best Performer", value: "Sweet Scoops", icon: Truck },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Event P&L Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Event-Level P&L</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Event", "Revenue", "Costs", "Profit", "Hours", "Rev/Hour", "Profit/Hour"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventPL.map((e) => (
                  <tr key={e.event} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-card-foreground">{e.event}</td>
                    <td className="px-4 py-3 text-card-foreground">${e.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">${e.costs.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-success">${e.profit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.hours}h</td>
                    <td className="px-4 py-3 text-card-foreground">${e.revPerHr}</td>
                    <td className="px-4 py-3 text-card-foreground">${e.profitPerHr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit by Event */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Profit by Event</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={eventPL} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 18%, 89%)" vertical={false} />
                <XAxis dataKey="event" tick={{ fontSize: 11, fill: "hsl(20, 10%, 48%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(20, 10%, 48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(30, 18%, 89%)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="revenue" fill="hsl(16, 65%, 48%)" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="profit" fill="hsl(152, 55%, 42%)" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trailer Comparison */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Trailer Revenue Comparison</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trailerComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 18%, 89%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(20, 10%, 48%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(20, 10%, 48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(30, 18%, 89%)", borderRadius: "8px", fontSize: "12px" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="Sweet Scoops" stroke="hsl(16, 65%, 48%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Brew Mobile" stroke="hsl(210, 70%, 52%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Kettle Kings" stroke="hsl(38, 85%, 52%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
