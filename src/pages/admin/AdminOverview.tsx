import { AdminLayout } from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, ShoppingCart, DollarSign } from "lucide-react";

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
      return {
        orgCount: orgs.count || 0,
        userCount: users.count || 0,
        orderCount: orders.count || 0,
        totalRevenue,
      };
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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            High-level metrics across all TrailerOS organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold text-foreground">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">
            Activity feed will populate as organizations create content.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
