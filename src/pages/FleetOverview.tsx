import { AppLayout } from "@/components/layout/AppLayout";
import { useTrailers } from "@/hooks/useTrailers";
import { useEvents } from "@/hooks/useEvents";
import { useBookings } from "@/hooks/useBookings";
import { useOrders } from "@/hooks/useOrders";
import { useMaintenanceRecords } from "@/hooks/useMaintenanceRecords";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradeBanner } from "@/components/UpgradeModal";
import { useMemo } from "react";
import { Truck, DollarSign, Calendar, Wrench, TrendingUp, Users, BarChart3, Loader2 } from "lucide-react";

export default function FleetOverview() {
  const ent = useEntitlements();
  const { data: trailers, isLoading } = useTrailers();
  const { data: events } = useEvents();
  const { data: bookings } = useBookings();
  const { data: orders } = useOrders();
  const { data: maintenance } = useMaintenanceRecords();

  if (!ent.fleetOverview) {
    return (
      <AppLayout>
        <UpgradeBanner feature="Fleet Overview" currentPlan={ent.currentPlan} requiredPlan="pro" />
      </AppLayout>
    );
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const trailerStats = useMemo(() => {
    if (!trailers) return [];
    return trailers.map(t => {
      const trailerEvents = events?.filter(e => e.trailer_id === t.id) || [];
      const upcomingEvents = trailerEvents.filter(e => e.event_date && new Date(e.event_date) >= now);
      const pastEvents = trailerEvents.filter(e => e.event_date && new Date(e.event_date) < now);
      const trailerBookings = bookings?.filter(b => b.trailer_id === t.id) || [];
      const pendingBookings = trailerBookings.filter(b => b.status === "pending");
      const trailerOrders = orders?.filter(o => o.trailer_id === t.id && new Date(o.created_at) >= thirtyDaysAgo) || [];
      const revenue30d = trailerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const pendingMaintenance = maintenance?.filter(m => m.trailer_id === t.id && m.status === "pending") || [];

      const ticket = Number(t.avg_ticket) || 0;
      const custPerHr = Number(t.avg_customers_per_hour) || 0;
      const foodCostPct = Number(t.avg_food_cost_percent) || 30;
      const profitPerHour = ticket * custPerHr * (1 - foodCostPct / 100);

      return {
        ...t,
        upcomingEvents: upcomingEvents.length,
        completedEvents: pastEvents.length,
        pendingBookings: pendingBookings.length,
        totalBookings: trailerBookings.length,
        revenue30d,
        pendingMaintenance: pendingMaintenance.length,
        profitPerHour,
        nextEvent: upcomingEvents.sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""))[0],
      };
    });
  }, [trailers, events, bookings, orders, maintenance, now]);

  const totals = useMemo(() => {
    return {
      revenue30d: trailerStats.reduce((s, t) => s + t.revenue30d, 0),
      upcomingEvents: trailerStats.reduce((s, t) => s + t.upcomingEvents, 0),
      pendingBookings: trailerStats.reduce((s, t) => s + t.pendingBookings, 0),
      pendingMaintenance: trailerStats.reduce((s, t) => s + t.pendingMaintenance, 0),
      activeTrailers: trailerStats.filter(t => t.status === "active").length,
    };
  }, [trailerStats]);

  if (isLoading) {
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all trailers and your whole business at a glance.</p>
        </div>

        {/* Fleet totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Active Trailers", value: totals.activeTrailers, icon: Truck, color: "text-primary" },
            { label: "Revenue (30d)", value: `$${totals.revenue30d.toLocaleString()}`, icon: DollarSign, color: "text-success" },
            { label: "Upcoming Events", value: totals.upcomingEvents, icon: Calendar, color: "text-info" },
            { label: "Pending Bookings", value: totals.pendingBookings, icon: Users, color: "text-warning" },
            { label: "Needs Maintenance", value: totals.pendingMaintenance, icon: Wrench, color: totals.pendingMaintenance > 0 ? "text-destructive" : "text-muted-foreground" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Per-trailer cards */}
        <div className="space-y-4">
          {trailerStats.map(t => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-card-foreground">{t.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        t.status === "active" ? "bg-success/10 text-success"
                        : t.status === "maintenance" ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                      }`}>{t.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.type || "Food Trailer"}</p>
                  </div>
                </div>
                {t.profitPerHour > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Profit/hr</p>
                    <p className="text-lg font-bold text-success">${t.profitPerHour.toFixed(0)}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Revenue 30d</p>
                  <p className="text-sm font-bold text-card-foreground">{t.revenue30d > 0 ? `$${t.revenue30d.toLocaleString()}` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Upcoming</p>
                  <p className="text-sm font-bold text-card-foreground">{t.upcomingEvents} events</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</p>
                  <p className="text-sm font-bold text-card-foreground">{t.completedEvents} events</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bookings</p>
                  <p className="text-sm font-bold text-card-foreground">{t.pendingBookings} pending / {t.totalBookings} total</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Maintenance</p>
                  <p className={`text-sm font-bold ${t.pendingMaintenance > 0 ? "text-destructive" : "text-card-foreground"}`}>
                    {t.pendingMaintenance > 0 ? `${t.pendingMaintenance} pending` : "All clear"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Next Event</p>
                  <p className="text-sm font-bold text-card-foreground">
                    {t.nextEvent?.event_date
                      ? new Date(t.nextEvent.event_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
