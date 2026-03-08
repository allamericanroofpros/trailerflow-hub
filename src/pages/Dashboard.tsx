import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueByTypeChart, TrailerPerformanceChart } from "@/components/dashboard/Charts";
import { SetupWizard } from "@/components/onboarding/SetupWizard";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useNavigate } from "react-router-dom";
import { useEventsByStage } from "@/hooks/useEvents";
import { useBookings } from "@/hooks/useBookings";
import { useTransactions } from "@/hooks/useTransactions";
import { useTrailers } from "@/hooks/useTrailers";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  TrendingUp,
  Truck,
  Percent,
  Clock,
  CalendarDays,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useEntitlements } from "@/hooks/useEntitlements";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canView } = useRoleAccess();
  const ent = useEntitlements();
  const { completedSteps, isComplete } = useOnboardingStatus();
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const { data: grouped, isLoading: eventsLoading } = useEventsByStage();
  const { data: bookings } = useBookings();
  const { data: transactions } = useTransactions();
  const { data: trailers } = useTrailers();
  const { data: orders } = useOrders();

  // Profile for name
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, business_name").eq("user_id", user!.id).single();
      return data;
    },
  });

  // Computed metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Revenue from completed orders in last 30 days
    const recentOrders = orders?.filter(o => new Date(o.created_at) >= thirtyDaysAgo) || [];
    const actualRevenue = recentOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Revenue from transactions
    const recentIncome = transactions?.filter(t => t.type === "income" && new Date(t.transaction_date) >= thirtyDaysAgo) || [];
    const recentExpenses = transactions?.filter(t => t.type === "expense" && new Date(t.transaction_date) >= thirtyDaysAgo) || [];
    const totalIncome = recentIncome.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalRevenue = actualRevenue || totalIncome;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0;

    // Forecasted revenue from confirmed/tentative events
    const upcomingEvents = grouped
      ? [...(grouped.confirmed || []), ...(grouped.tentative || [])].filter(e => e.event_date && new Date(e.event_date) >= now)
      : [];
    const forecastedRevenue = upcomingEvents.reduce((sum, e) => {
      const avg = ((e.revenue_forecast_low || 0) + (e.revenue_forecast_high || 0)) / 2;
      return sum + avg;
    }, 0);

    // Trailer utilization
    const activeTrailers = trailers?.filter(t => t.status === "active").length || 0;
    const trailersWithEvents = new Set(
      Object.values(grouped || {}).flat().filter(e => e.trailer_id && e.event_date && new Date(e.event_date) >= thirtyDaysAgo).map(e => e.trailer_id)
    ).size;
    const utilization = activeTrailers > 0 ? Math.round((trailersWithEvents / activeTrailers) * 100) : 0;

    // Pending bookings
    const pendingBookings = bookings?.filter(b => b.status === "pending").length || 0;

    // Events in next 7 days
    const eventsNext7 = Object.values(grouped || {}).flat().filter(e =>
      e.event_date && new Date(e.event_date) >= now && new Date(e.event_date) <= sevenDaysFromNow
    ).length;

    // Pipeline counts
    const pipelineCounts = {
      lead: grouped?.lead?.length || 0,
      applied: grouped?.applied?.length || 0,
      tentative: grouped?.tentative?.length || 0,
      confirmed: grouped?.confirmed?.length || 0,
      completed: grouped?.completed?.length || 0,
    };

    return { actualRevenue: totalRevenue, forecastedRevenue, profitMargin, utilization, pendingBookings, eventsNext7, pipelineCounts };
  }, [orders, transactions, grouped, trailers, bookings]);

  const pipelineStages = [
    { stage: "Lead", count: metrics.pipelineCounts.lead, color: "bg-muted-foreground" },
    { stage: "Applied", count: metrics.pipelineCounts.applied, color: "bg-info" },
    { stage: "Tentative", count: metrics.pipelineCounts.tentative, color: "bg-warning" },
    { stage: "Confirmed", count: metrics.pipelineCounts.confirmed, color: "bg-success" },
    { stage: "Completed", count: metrics.pipelineCounts.completed, color: "bg-primary" },
  ];

  const totalPipeline = pipelineStages.reduce((s, p) => s + p.count, 0) || 1;
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const actionItems = [
    { label: "Pending Bookings", count: metrics.pendingBookings, icon: Clock, color: "text-warning", href: "/bookings" },
    { label: "Active Trailers", count: trailers?.filter(t => t.status === "active").length || 0, icon: Truck, color: "text-primary", href: "/trailers" },
    { label: "Events Next 7 Days", count: metrics.eventsNext7, icon: CalendarDays, color: "text-info", href: "/calendar" },
  ];

  if (eventsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, {firstName}. Here's your business at a glance.</p>
          </div>
          {canView("pos") && (
            <button
              onClick={() => navigate("/pos")}
              className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all touch-manipulation group"
            >
              <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-black tracking-tight">Open for Business</span>
            </button>
          )}
        </div>

        {/* Setup Wizard */}
        {!isComplete && !wizardDismissed && (
          <SetupWizard completedSteps={completedSteps} onDismiss={() => setWizardDismissed(true)} />
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Forecasted Revenue"
            value={metrics.forecastedRevenue > 0 ? `$${metrics.forecastedRevenue.toLocaleString()}` : "—"}
            subtitle="Upcoming events"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            title="Revenue (30d)"
            value={metrics.actualRevenue > 0 ? `$${metrics.actualRevenue.toLocaleString()}` : "—"}
            subtitle="Last 30 days"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            title="Trailer Utilization"
            value={`${metrics.utilization}%`}
            icon={<Truck className="h-5 w-5" />}
          />
          <MetricCard
            title="Profit Margin"
            value={metrics.profitMargin > 0 ? `${metrics.profitMargin.toFixed(1)}%` : "—"}
            icon={<Percent className="h-5 w-5" />}
          />
        </div>

        {/* Action Items */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {actionItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.href)}
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

        {/* Bottom: Charts + Pipeline */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <button
            onClick={() => navigate("/events")}
            className="rounded-xl border border-border bg-card p-5 shadow-card text-left hover:shadow-card-hover transition-shadow"
          >
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
                <div key={s.stage} className={`${s.color} transition-all`} style={{ width: `${(s.count / totalPipeline) * 100}%` }} />
              ))}
            </div>
          </button>

          <RevenueByTypeChart />
          <TrailerPerformanceChart />
        </div>

        {/* Quick Access Buttons */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => navigate("/orders-queue")}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card text-left hover:shadow-card-hover transition-shadow"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Orders & Queue</h3>
              <p className="text-xs text-muted-foreground mt-0.5">View active orders and history — ideal for a second screen</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>

          {ent.aiDiscovery && (
            <button
              onClick={() => navigate("/discover")}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card text-left hover:shadow-card-hover transition-shadow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">Discover New Events</h3>
                <p className="text-xs text-muted-foreground mt-0.5">AI-powered event search for your trailers</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
