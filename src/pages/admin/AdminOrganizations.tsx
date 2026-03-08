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
  Truck, UtensilsCrossed, ShoppingCart, DollarSign, Users, Copy, Edit3,
  Plus, Unlink, Calendar, Wrench, UserPlus, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const orgRoles = ["owner", "manager", "staff"];

function invoke(action: string, body: Record<string, unknown> = {}) {
  return supabase.functions.invoke("admin-manage-user", { body: { action, ...body } });
}

// ─── Org Detail View ───
function OrgDetailView({ orgId, onBack }: { orgId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("staff");

  const { data: org, refetch: refetchOrg } = useQuery({
    queryKey: ["admin_org_detail", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).single();
      if (error) throw error;
      return data;
    },
  });

  const [editFields, setEditFields] = useState<Record<string, any>>({});

  const startEdit = () => {
    if (!org) return;
    setEditFields({
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      tax_enabled: org.tax_enabled,
      tax_label: org.tax_label,
      tax_percent: org.tax_percent,
      tax_inclusive: org.tax_inclusive,
      surcharge_enabled: org.surcharge_enabled,
      surcharge_label: org.surcharge_label,
      surcharge_percent: org.surcharge_percent,
    });
    setEditMode(true);
  };

  const saveOrg = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("update_org", { org_id: orgId, data: editFields });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      refetchOrg();
      qc.invalidateQueries({ queryKey: ["admin_organizations"] });
      toast.success("Organization updated");
      setEditMode(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const repairOrg = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("repair_org_membership", { org_id: orgId });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin_org_members", orgId] });
      toast.success(data?.message || "Repair complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["admin_org_members", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("org_id", orgId);
      if (!data) return [];
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return data.map((m) => ({
        ...m,
        full_name: profiles?.find((p) => p.user_id === m.user_id)?.full_name || "Unnamed",
      }));
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin_org_stats", orgId],
    queryFn: async () => {
      const [trailers, staff, events, bookings, orders, transactions] = await Promise.all([
        supabase.from("trailers").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("staff_members").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      ]);
      return {
        trailers: trailers.count || 0,
        staff: staff.count || 0,
        events: events.count || 0,
        bookings: bookings.count || 0,
        orders: orders.count || 0,
        transactions: transactions.count || 0,
      };
    },
  });

  // Users not in this org for adding
  const { data: allProfiles } = useQuery({
    queryKey: ["admin_all_profiles_short"],
    enabled: showAddMember,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      return data || [];
    },
  });

  const memberIds = new Set(members?.map((m) => m.user_id) || []);
  const availableUsers = allProfiles?.filter((p) => !memberIds.has(p.user_id)) || [];

  const changeOrgRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { data, error } = await invoke("change_org_role", { user_id: userId, org_id: orgId, org_role: newRole });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { refetchMembers(); toast.success("Role updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await invoke("remove_membership", { user_id: userId, org_id: orgId });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { refetchMembers(); toast.success("Member removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!addUserId) throw new Error("Select a user");
      const { data, error } = await invoke("add_membership", { user_id: addUserId, org_id: orgId, org_role: addRole });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      refetchMembers();
      toast.success("Member added");
      setShowAddMember(false);
      setAddUserId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const section = "rounded-xl border border-border bg-card p-4 sm:p-5";

  const statCards = [
    { label: "Trailers", value: stats?.trailers ?? 0, icon: Truck },
    { label: "Staff", value: stats?.staff ?? 0, icon: Users },
    { label: "Events", value: stats?.events ?? 0, icon: Calendar },
    { label: "Bookings", value: stats?.bookings ?? 0, icon: Calendar },
    { label: "Orders", value: stats?.orders ?? 0, icon: ShoppingCart },
    { label: "Transactions", value: stats?.transactions ?? 0, icon: DollarSign },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{org?.name || "..."}</h1>
          <p className="text-xs text-muted-foreground">{org?.slug}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(orgId); toast.success("Org ID copied"); }}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />Copy ID
          </Button>
          <Button variant="outline" size="sm" onClick={() => repairOrg.mutate()} disabled={repairOrg.isPending}>
            <Wrench className="h-3.5 w-3.5 mr-1.5" />Repair
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg sm:text-xl font-bold">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Org Details / Edit */}
      <div className={section}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />Organization Details</h3>
          {!editMode ? (
            <Button variant="ghost" size="sm" onClick={startEdit} className="text-xs h-7"><Edit3 className="h-3 w-3 mr-1" />Edit</Button>
          ) : null}
        </div>
        {editMode ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={editFields.name || ""} onChange={(e) => setEditFields({ ...editFields, name: e.target.value })} className="mt-1 h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Slug</label>
                <Input value={editFields.slug || ""} onChange={(e) => setEditFields({ ...editFields, slug: e.target.value })} className="mt-1 h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Plan</label>
                <Select value={editFields.plan} onValueChange={(v) => setEditFields({ ...editFields, plan: v })}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["free", "starter", "pro", "enterprise"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={editFields.status} onValueChange={(v) => setEditFields({ ...editFields, status: v })}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active", "suspended"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Tax settings */}
            <div className="border-t border-border pt-3 mt-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tax Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tax Enabled</span>
                  <Switch checked={editFields.tax_enabled} onCheckedChange={(v) => setEditFields({ ...editFields, tax_enabled: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tax Inclusive</span>
                  <Switch checked={editFields.tax_inclusive} onCheckedChange={(v) => setEditFields({ ...editFields, tax_inclusive: v })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tax Label</label>
                  <Input value={editFields.tax_label || ""} onChange={(e) => setEditFields({ ...editFields, tax_label: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tax %</label>
                  <Input type="number" step="0.01" value={editFields.tax_percent ?? 0} onChange={(e) => setEditFields({ ...editFields, tax_percent: Number(e.target.value) })} className="mt-1 h-9" />
                </div>
              </div>
            </div>
            {/* Surcharge settings */}
            <div className="border-t border-border pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Surcharge Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Surcharge Enabled</span>
                  <Switch checked={editFields.surcharge_enabled} onCheckedChange={(v) => setEditFields({ ...editFields, surcharge_enabled: v })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Surcharge Label</label>
                  <Input value={editFields.surcharge_label || ""} onChange={(e) => setEditFields({ ...editFields, surcharge_label: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Surcharge %</label>
                  <Input type="number" step="0.01" value={editFields.surcharge_percent ?? 0} onChange={(e) => setEditFields({ ...editFields, surcharge_percent: Number(e.target.value) })} className="mt-1 h-9" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => saveOrg.mutate()} disabled={saveOrg.isPending}>Save Changes</Button>
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          </div>
        ) : org ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <InfoRow label="Plan"><Badge variant="secondary" className="capitalize text-xs">{org.plan}</Badge></InfoRow>
            <InfoRow label="Status"><Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize text-xs">{org.status}</Badge></InfoRow>
            <InfoRow label="Tax">{org.tax_enabled ? `${org.tax_percent}% ${org.tax_label}${org.tax_inclusive ? " (inclusive)" : ""}` : "Disabled"}</InfoRow>
            <InfoRow label="Surcharge">{org.surcharge_enabled ? `${org.surcharge_percent}% ${org.surcharge_label}` : "Disabled"}</InfoRow>
            <InfoRow label="Subscription">{org.subscription_status}</InfoRow>
            <InfoRow label="Created">{new Date(org.created_at).toLocaleDateString()}</InfoRow>
          </div>
        ) : null}
      </div>

      {/* Members */}
      <div className={section}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Members ({members?.length || 0})</h3>
          <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)} className="text-xs h-7">
            <Plus className="h-3 w-3 mr-1" />Add Member
          </Button>
        </div>
        {members?.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>No members in this organization.</span>
          </div>
        ) : (
          <div className="space-y-1">
            {members?.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30">
                <span className="text-sm font-medium">{m.full_name}</span>
                <div className="flex items-center gap-2">
                  <Select value={m.role} onValueChange={(v) => changeOrgRole.mutate({ userId: m.user_id, newRole: v })}>
                    <SelectTrigger className="h-7 w-24 text-xs border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {orgRoles.map((r) => <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => { if (confirm(`Remove ${m.full_name}?`)) removeMember.mutate(m.user_id); }}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Member to {org?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">User</label>
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0, 8)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={() => addMember.mutate()} disabled={addMember.isPending || !addUserId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{children}</span>
    </div>
  );
}

// ─── Main AdminOrganizations ───
export default function AdminOrganizations() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_organizations"] }); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (selectedOrgId) {
    return (
      <AdminLayout>
        <OrgDetailView orgId={selectedOrgId} onBack={() => setSelectedOrgId(null)} />
      </AdminLayout>
    );
  }

  const filtered = orgs?.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase()) ||
    o.plan.toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {orgs?.length || 0} organizations · Click any org for full details
          </p>
        </div>

        <div className="relative max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, plan, or status..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No organizations found.</p>
          ) : (
            filtered?.map((org) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrgId(org.id)}
                className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-all"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{org.name}</span>
                    <Badge variant="secondary" className="capitalize text-[10px] h-5">{org.plan}</Badge>
                    <Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize text-[10px] h-5">{org.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{org.slug}</span>
                    <span>{(org as any).organization_members?.[0]?.count ?? 0} members</span>
                    <span className="hidden sm:inline">{new Date(org.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(org.id); toast.success("Org ID copied"); }}>
                        <Copy className="h-4 w-4 mr-2" />Copy Org ID
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: org.id, status: org.status })}>
                        {org.status === "active" ? <><Ban className="h-4 w-4 mr-2" />Suspend</> : <><CheckCircle className="h-4 w-4 mr-2" />Reactivate</>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
