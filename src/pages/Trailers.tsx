import { AppLayout } from "@/components/layout/AppLayout";
import { Truck, TrendingUp, Calendar, Wrench, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";

const trailersData = [
  {
    name: "Sweet Scoops",
    type: "Ice Cream Trailer",
    status: "Active",
    utilization: 78,
    revenue: "$24,600",
    events: 18,
    topEventType: "Festivals",
    nextMaintenance: "Mar 15",
    monthlyRevenue: [
      { month: "Oct", rev: 3200 }, { month: "Nov", rev: 2800 }, { month: "Dec", rev: 4100 },
      { month: "Jan", rev: 3600 }, { month: "Feb", rev: 4800 }, { month: "Mar", rev: 6100 },
    ],
  },
  {
    name: "Brew Mobile",
    type: "Coffee Cart",
    status: "Active",
    utilization: 85,
    revenue: "$19,200",
    events: 22,
    topEventType: "Corporate",
    nextMaintenance: "Apr 2",
    monthlyRevenue: [
      { month: "Oct", rev: 2900 }, { month: "Nov", rev: 3200 }, { month: "Dec", rev: 2600 },
      { month: "Jan", rev: 3100 }, { month: "Feb", rev: 3800 }, { month: "Mar", rev: 3600 },
    ],
  },
  {
    name: "Kettle Kings",
    type: "Kettle Corn Trailer",
    status: "Maintenance",
    utilization: 62,
    revenue: "$15,800",
    events: 14,
    topEventType: "Markets",
    nextMaintenance: "In Progress",
    monthlyRevenue: [
      { month: "Oct", rev: 2200 }, { month: "Nov", rev: 2600 }, { month: "Dec", rev: 3100 },
      { month: "Jan", rev: 2400 }, { month: "Feb", rev: 2800 }, { month: "Mar", rev: 2700 },
    ],
  },
];

export default function Trailers() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trailers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and compare trailer performance.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {trailersData.map((trailer) => (
            <div key={trailer.name} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Info */}
                <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-card-foreground">{trailer.name}</h3>
                      <p className="text-xs text-muted-foreground">{trailer.type}</p>
                    </div>
                    <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      trailer.status === "Active"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}>
                      {trailer.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Revenue (6mo)", value: trailer.revenue, icon: TrendingUp },
                      { label: "Events", value: trailer.events.toString(), icon: Calendar },
                      { label: "Utilization", value: `${trailer.utilization}%`, icon: BarChart3 },
                      { label: "Next Maintenance", value: trailer.nextMaintenance, icon: Wrench },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-background border border-border p-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                          <stat.icon className="h-3 w-3" />
                          <span className="text-[11px]">{stat.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-card-foreground">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div className="w-full lg:w-[320px] p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Monthly Revenue</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={trailer.monthlyRevenue} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 18%, 89%)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(20, 10%, 48%)" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(30, 18%, 89%)", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                      />
                      <Bar dataKey="rev" fill="hsl(16, 65%, 48%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
