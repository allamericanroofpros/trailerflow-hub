import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, ShoppingCart, DollarSign, UserPlus, Truck, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type ActivityItem = {
  id: string;
  type: "org_created" | "user_joined" | "order_placed";
  title: string;
  detail: string;
  time: string;
  icon: typeof Building2;
  color: string;
};

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [orgs, users, orders, transactions] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("amount").eq("type", "income"),
      ]);
      const totalRevenue = transactions.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      return { orgCount: orgs.count || 0, userCount: users.count || 0, orderCount: orders.count || 0, totalRevenue };
    },
  });

  // Activity feed: recent orgs, users, orders
  const { data: activity } = useQuery({
    queryKey: ["admin_activity_feed"],
    queryFn: async () => {
      const [recentOrgs, recentUsers, recentOrders] = await Promise.all([
        supabase.from("organizations").select("id, name, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("orders").select("id, order_number, total, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const items: ActivityItem[] = [];

      recentOrgs.data?.forEach(o => items.push({
        id: `org-${o.id}`,
        type: "org_created",
        title: "New organization",
        detail: o.name,
        time: o.created_at,
        icon: Building2,
        color: "text-primary bg-primary/10",
      }));

      recentUsers.data?.forEach(u => items.push({
        id: `user-${u.id}`,
        type: "user_joined",
        title: "User registered",
        detail: u.full_name || "Unnamed user",
        time: u.created_at,
        icon: UserPlus,
        color: "text-blue-600 bg-blue-100",
      }));

      recentOrders.data?.forEach(o => items.push({
        id: `order-${o.id}`,
        type: "order_placed",
        title: `Order #${o.order_number}`,
        detail: `$${Number(o.total).toFixed(1)}`,
        time: o.created_at,
        icon: ShoppingCart,
        color: "text-emerald-600 bg-emerald-100",
      }));

      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
    },
  });

  const cards = [
    { label: "Organizations", value: stats?.orgCount ?? "—", icon: Building2, color: "text-primary" },
    { label: "Total Users", value: stats?.userCount ?? "—", icon: Users, color: "text-blue-600" },
    { label: "Total Orders", value: stats?.orderCount ?? "—", icon: ShoppingCart, color: "text-emerald-600" },
    { label: "Platform Revenue", value: stats ? `$${stats.totalRevenue.toLocaleString()}` : "—", icon: DollarSign, color: "text-amber-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">High-level metrics across all VendorFlow organizations.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-3 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-secondary ${card.color}`}>
                  <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{card.label}</p>
                  <p className="text-base sm:text-xl font-bold text-foreground">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />Recent Activity
          </h3>
          {!activity || activity.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No activity yet.</p>
          ) : (
            <div className="space-y-1">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.title} <span className="font-normal text-muted-foreground">— {item.detail}</span>
                    </p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
