import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import {
  Building2, Search, MoreHorizontal, Ban, CheckCircle, ChevronRight, ArrowLeft,
  Truck, UtensilsCrossed, ShoppingCart, DollarSign, Users,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function OrgDetailView({ orgId, orgName, onBack }: { orgId: string; orgName: string; onBack: () => void }) {
  const { data: members } = useQuery({
    queryKey: ["admin_org_members", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("org_id", orgId);
      if (!data) return [];
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      return data.map(m => ({
        ...m,
        full_name: profiles?.find(p => p.user_id === m.user_id)?.full_name || "Unnamed",
      }));
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin_org_stats", orgId],
    queryFn: async () => {
      const [trailers, menuItems, orders, transactions] = await Promise.all([
        supabase.from("trailers").select("id, name, status, type").eq("org_id", orgId),
        supabase.from("menu_items").select("id, name, price, category, is_active").eq("org_id", orgId),
        supabase.from("orders").select("id, total, status, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50),
        supabase.from("transactions").select("amount, type, transaction_date").eq("org_id", orgId),
      ]);

      const revenue = transactions.data?.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0) || 0;
      const expenses = transactions.data?.filter(t => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount || 0), 0) || 0;

      return {
        trailers: trailers.data || [],
        menuItems: menuItems.data || [],
        orders: orders.data || [],
        revenue,
        expenses,
        orderCount: orders.data?.length || 0,
      };
    },
  });

  const statCards = [
    { label: "Trailers", value: stats?.trailers.length ?? 0, icon: Truck, color: "text-primary" },
    { label: "Menu Items", value: stats?.menuItems.length ?? 0, icon: UtensilsCrossed, color: "text-blue-600" },
    { label: "Orders", value: stats?.orderCount ?? 0, icon: ShoppingCart, color: "text-emerald-600" },
    { label: "Revenue", value: stats ? `$${stats.revenue.toLocaleString()}` : "—", icon: DollarSign, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{orgName}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Organization deep dive</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-secondary ${c.color}`}>
                <c.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{c.label}</p>
                <p className="text-base sm:text-lg font-bold">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Members ({members?.length || 0})</h3>
        <div className="space-y-2">
          {members?.map(m => (
            <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium">{m.full_name}</span>
              <Badge variant="secondary" className="capitalize text-xs">{m.role}</Badge>
            </div>
          ))}
          {(!members || members.length === 0) && <p className="text-xs text-muted-foreground">No members</p>}
        </div>
      </div>

      {/* Trailers */}
      {stats?.trailers && stats.trailers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Truck className="h-4 w-4" />Trailers</h3>
          <div className="space-y-2">
            {stats.trailers.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.type && <span className="text-xs text-muted-foreground ml-2">({t.type})</span>}
                </div>
                <Badge variant={t.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{t.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {stats?.orders && stats.orders.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Recent Orders</h3>
          <div className="space-y-2">
            {stats.orders.slice(0, 10).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">
                  <span className="font-medium">${Number(o.total).toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground ml-2">{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
                <Badge variant={o.status === "served" ? "default" : "secondary"} className="capitalize text-xs">{o.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Overview */}
      {stats?.menuItems && stats.menuItems.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" />Menu Items ({stats.menuItems.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stats.menuItems.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30">
                <span className="text-sm truncate">{m.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-primary">${Number(m.price).toFixed(2)}</span>
                  {!m.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrganizations() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*, organization_members(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "suspended" : "active";
      const { error } = await supabase.from("organizations").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_organizations"] }); toast.success("Organization status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (selectedOrg) {
    return (
      <AdminLayout>
        <OrgDetailView orgId={selectedOrg.id} orgName={selectedOrg.name} onBack={() => setSelectedOrg(null)} />
      </AdminLayout>
    );
  }

  const filtered = orgs?.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Click any org to see full details.</p>
        </div>

        <div className="relative max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search organizations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No organizations found.</p>
          ) : (
            filtered?.map((org) => (
              <div
                key={org.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setSelectedOrg({ id: org.id, name: org.name })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{org.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{org.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleStatus.mutate({ id: org.id, status: org.status }); }}>
                          {org.status === "active" ? <><Ban className="h-4 w-4 mr-2" />Suspend</> : <><CheckCircle className="h-4 w-4 mr-2" />Reactivate</>}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="secondary" className="capitalize text-xs">{org.plan}</Badge>
                  <Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize text-xs">{org.status}</Badge>
                  <span className="text-xs text-muted-foreground">{(org as any).organization_members?.[0]?.count ?? 0} members</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(org.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organization</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Members</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered?.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No organizations found.</td></tr>
                ) : (
                  filtered?.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedOrg({ id: org.id, name: org.name })}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{org.name}</p>
                            <p className="text-xs text-muted-foreground">{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{org.plan}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize">{org.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{(org as any).organization_members?.[0]?.count ?? 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(org.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: org.id, status: org.status })}>
                              {org.status === "active" ? <><Ban className="h-4 w-4 mr-2" />Suspend</> : <><CheckCircle className="h-4 w-4 mr-2" />Reactivate</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
