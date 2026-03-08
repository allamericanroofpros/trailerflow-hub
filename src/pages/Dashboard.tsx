import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueByTypeChart, TrailerPerformanceChart } from "@/components/dashboard/Charts";
import { useAIForecast } from "@/hooks/useAIForecast";
import {
  DollarSign,
  TrendingUp,
  Truck,
  Percent,
  Clock,
  Users,
  CalendarDays,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

const actionItems = [
  { label: "Booking Requests Pending", count: 4, icon: Clock, color: "text-warning" },
  { label: "Staffing Conflicts", count: 2, icon: AlertTriangle, color: "text-destructive" },
  { label: "Events Next 7 Days", count: 6, icon: CalendarDays, color: "text-info" },
];

const pipelineStages = [
  { stage: "Lead", count: 8, color: "bg-muted-foreground" },
  { stage: "Applied", count: 5, color: "bg-info" },
  { stage: "Tentative", count: 3, color: "bg-warning" },
  { stage: "Confirmed", count: 7, color: "bg-success" },
  { stage: "Completed", count: 12, color: "bg-primary" },
];

const defaultSuggestions = [
  { event: "Downtown Food Festival", date: "Mar 15-16", revenue: "$3,200–$4,800", confidence: "87%" },
  { event: "Corporate Wellness Fair", date: "Mar 22", revenue: "$1,800–$2,400", confidence: "72%" },
  { event: "Spring Market Series", date: "Apr 5-6", revenue: "$2,100–$3,000", confidence: "91%" },
];

export default function Dashboard() {
  const { data: forecast } = useAIForecast();
  const aiSuggestions = forecast?.suggestions?.length ? forecast.suggestions : defaultSuggestions;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, Jamie. Here's your business at a glance.</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Forecasted Revenue"
            value="$18,400"
            change="+12% vs last month"
            trend="up"
            subtitle="Next 30 days"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            title="Actual Revenue"
            value="$22,650"
            change="+8.3% vs prior"
            trend="up"
            subtitle="Last 30 days"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            title="Trailer Utilization"
            value="74%"
            change="+5% improvement"
            trend="up"
            icon={<Truck className="h-5 w-5" />}
          />
          <MetricCard
            title="Profit Margin"
            value="38.2%"
            change="-1.4% vs prior"
            trend="down"
            icon={<Percent className="h-5 w-5" />}
          />
        </div>

        {/* Action Required */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {actionItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card text-left hover:shadow-card-hover transition-shadow"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">{item.label}</p>
                <p className="text-2xl font-bold text-card-foreground">{item.count}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Bottom: Charts + AI */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Pipeline */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Event Pipeline</h3>
            <div className="space-y-3">
              {pipelineStages.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                  <span className="flex-1 text-sm text-muted-foreground">{s.stage}</span>
                  <span className="text-sm font-semibold text-card-foreground">{s.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-secondary">
              {pipelineStages.map((s) => (
                <div
                  key={s.stage}
                  className={`${s.color} transition-all`}
                  style={{ width: `${(s.count / 35) * 100}%` }}
                />
              ))}
            </div>
          </div>

          {/* Revenue by Event Type */}
          <RevenueByTypeChart />

          {/* Trailer Performance */}
          <TrailerPerformanceChart />
        </div>

        {/* AI Suggested Opportunities */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">AI Suggested Opportunities</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {aiSuggestions.map((s) => (
              <div
                key={s.event}
                className="rounded-lg border border-border bg-background p-4 hover:shadow-card transition-shadow"
              >
                <p className="text-sm font-semibold text-card-foreground">{s.event}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.date}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">{s.revenue}</span>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    {s.confidence} match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
