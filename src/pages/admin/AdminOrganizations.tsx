import { AdminLayout } from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, Search, MoreHorizontal, Ban, CheckCircle, ChevronRight, ArrowLeft,
  Truck, UtensilsCrossed, ShoppingCart, DollarSign, Users, Copy, Edit3,
  Plus, Unlink, Calendar, Wrench, UserPlus, AlertTriangle, Heart,
  MessageSquare, Tag, Clock, ChevronDown, Send, Activity, TrendingDown,
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
import { format, formatDistanceToNow } from "date-fns";

const orgRoles = ["owner", "manager", "staff"];

const healthColors: Record<string, string> = {
  healthy: "text-emerald-600 bg-emerald-100",
  warning: "text-amber-600 bg-amber-100",
  at_risk: "text-destructive bg-destructive/10",
  churned: "text-muted-foreground bg-muted",
};

const churnColors: Record<string, string> = {
  low: "text-emerald-600 border-emerald-200",
  medium: "text-amber-600 border-amber-300",
  high: "text-destructive border-destructive/30",
};

const onboardingStages = ["new", "invited", "setup", "active", "churned"];
const healthStatuses = ["healthy", "warning", "at_risk", "churned"];
const churnRisks = ["low", "medium", "high"];

function invoke(action: string, body: Record<string, unknown> = {}) {
  return supabase.functions.invoke("admin-manage-user", { body: { action, ...body } });
}

// ─── Org Detail View (CRM) ───
function OrgDetailView({ orgId, onBack }: { orgId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("staff");
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState("general");
  const [newTag, setNewTag] = useState("");

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
      name: org.name, slug: org.slug, plan: org.plan, status: org.status,
      tax_enabled: org.tax_enabled, tax_label: org.tax_label, tax_percent: org.tax_percent,
      tax_inclusive: org.tax_inclusive, surcharge_enabled: org.surcharge_enabled,
      surcharge_label: org.surcharge_label, surcharge_percent: org.surcharge_percent,
      onboarding_stage: (org as any).onboarding_stage || "new",
      assigned_owner: (org as any).assigned_owner || "",
      source: (org as any).source || "",
      health_status: (org as any).health_status || "healthy",
      churn_risk: (org as any).churn_risk || "low",
      follow_up_date: (org as any).follow_up_date || "",
      feature_request_notes: (org as any).feature_request_notes || "",
      support_notes: (org as any).support_notes || "",
      crm_notes: (org as any).crm_notes || "",
    });
    setEditMode(true);
  };

  const saveOrg = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("update_org", { org_id: orgId, data: editFields });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => { refetchOrg(); qc.invalidateQueries({ queryKey: ["admin_organizations"] }); toast.success("Organization updated"); setEditMode(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const repairOrg = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("repair_org_membership", { org_id: orgId });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["admin_org_members", orgId] }); toast.success(data?.message || "Repair complete"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["admin_org_members", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("organization_members").select("user_id, role").eq("org_id", orgId);
      if (!data) return [];
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return data.map((m) => ({ ...m, full_name: profiles?.find((p) => p.user_id === m.user_id)?.full_name || "Unnamed" }));
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
        supabase.from("transactions").select("amount, type", { count: "exact" }).eq("org_id", orgId).eq("type", "income"),
      ]);
      const mrr = transactions.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      return {
        trailers: trailers.count || 0, staff: staff.count || 0, events: events.count || 0,
        bookings: bookings.count || 0, orders: orders.count || 0, transactions: transactions.count || 0, mrr,
      };
    },
  });

  // Usage metrics
  const { data: usage } = useQuery({
    queryKey: ["admin_org_usage", orgId],
    queryFn: async () => {
      const [lastOrder, lastBooking, lastEvent] = await Promise.all([
        supabase.from("orders").select("created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("bookings").select("created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("events").select("created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return {
        lastOrder: lastOrder.data?.created_at || null,
        lastBooking: lastBooking.data?.created_at || null,
        lastEvent: lastEvent.data?.created_at || null,
        taxConfigured: !!org?.tax_enabled,
        surchargeConfigured: !!org?.surcharge_enabled,
      };
    },
    enabled: !!org,
  });

  // Notes timeline
  const { data: notes, refetch: refetchNotes } = useQuery({
    queryKey: ["admin_org_notes", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_notes").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Tags
  const { data: tags, refetch: refetchTags } = useQuery({
    queryKey: ["admin_org_tags", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("org_tags").select("*").eq("org_id", orgId).order("tag");
      return data || [];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) throw new Error("Note is empty");
      const { error } = await supabase.from("org_notes").insert({ org_id: orgId, author_id: user!.id, note_type: newNoteType, content: newNote.trim() });
      if (error) throw error;
    },
    onSuccess: () => { refetchNotes(); setNewNote(""); toast.success("Note added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTag = useMutation({
    mutationFn: async () => {
      if (!newTag.trim()) throw new Error("Tag is empty");
      const { error } = await supabase.from("org_tags").insert({ org_id: orgId, tag: newTag.trim().toLowerCase() });
      if (error) throw error;
    },
    onSuccess: () => { refetchTags(); setNewTag(""); toast.success("Tag added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("org_tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => { refetchTags(); toast.success("Tag removed"); },
  });

  // Member management
  const { data: allProfiles } = useQuery({
    queryKey: ["admin_all_profiles_short"],
    enabled: showAddMember,
    queryFn: async () => { const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name"); return data || []; },
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
    onSuccess: () => { refetchMembers(); toast.success("Member added"); setShowAddMember(false); setAddUserId(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const section = "rounded-xl border border-border bg-card p-4 sm:p-5";

  const statCards = [
    { label: "Trailers", value: stats?.trailers ?? 0, icon: Truck },
    { label: "Staff", value: stats?.staff ?? 0, icon: Users },
    { label: "Events", value: stats?.events ?? 0, icon: Calendar },
    { label: "Bookings", value: stats?.bookings ?? 0, icon: Calendar },
    { label: "Orders", value: stats?.orders ?? 0, icon: ShoppingCart },
    { label: "Revenue", value: `$${(stats?.mrr ?? 0).toLocaleString()}`, icon: DollarSign },
  ];

  const noteTypes = ["general", "support", "onboarding", "feature_request", "follow_up"];

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{org?.name || "..."}</h1>
            {org && (
              <>
                <Badge variant="secondary" className="capitalize text-[10px]">{org.plan}</Badge>
                <Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize text-[10px]">{org.status}</Badge>
                <Badge className={`text-[10px] capitalize ${healthColors[(org as any).health_status] || ""}`}>
                  {((org as any).health_status || "healthy").replace("_", " ")}
                </Badge>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{org?.slug} · Created {org ? format(new Date(org.created_at), "PP") : "—"}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(orgId); toast.success("Org ID copied"); }}><Copy className="h-3.5 w-3.5 mr-1.5" />Copy ID</Button>
          <Button variant="outline" size="sm" onClick={() => repairOrg.mutate()} disabled={repairOrg.isPending}><Wrench className="h-3.5 w-3.5 mr-1.5" />Repair</Button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        {tags?.map((t: any) => (
          <Badge key={t.id} variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => removeTag.mutate(t.id)}>
            {t.tag} ×
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag…" className="h-6 w-24 text-[10px] px-2"
            onKeyDown={(e) => e.key === "Enter" && addTag.mutate()} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CRM / Org Details */}
        <div className={section}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />Account Details</h3>
            {!editMode && <Button variant="ghost" size="sm" onClick={startEdit} className="text-xs h-7"><Edit3 className="h-3 w-3 mr-1" />Edit</Button>}
          </div>
          {editMode ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={editFields.name || ""} onChange={(e) => setEditFields({ ...editFields, name: e.target.value })} className="mt-1 h-9" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Slug</label><Input value={editFields.slug || ""} onChange={(e) => setEditFields({ ...editFields, slug: e.target.value })} className="mt-1 h-9" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Plan</label>
                  <Select value={editFields.plan} onValueChange={(v) => setEditFields({ ...editFields, plan: v })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{["free", "starter", "pro", "enterprise"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={editFields.status} onValueChange={(v) => setEditFields({ ...editFields, status: v })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{["active", "suspended"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Onboarding Stage</label>
                  <Select value={editFields.onboarding_stage} onValueChange={(v) => setEditFields({ ...editFields, onboarding_stage: v })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{onboardingStages.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Health Status</label>
                  <Select value={editFields.health_status} onValueChange={(v) => setEditFields({ ...editFields, health_status: v })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{healthStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Churn Risk</label>
                  <Select value={editFields.churn_risk} onValueChange={(v) => setEditFields({ ...editFields, churn_risk: v })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{churnRisks.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Assigned Owner</label><Input value={editFields.assigned_owner || ""} onChange={(e) => setEditFields({ ...editFields, assigned_owner: e.target.value })} className="mt-1 h-9" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Source</label><Input value={editFields.source || ""} onChange={(e) => setEditFields({ ...editFields, source: e.target.value })} className="mt-1 h-9" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Follow-up Date</label><Input type="date" value={editFields.follow_up_date || ""} onChange={(e) => setEditFields({ ...editFields, follow_up_date: e.target.value || null })} className="mt-1 h-9" /></div>
              </div>
              {/* Tax */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tax Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between"><span className="text-sm">Tax Enabled</span><Switch checked={editFields.tax_enabled} onCheckedChange={(v) => setEditFields({ ...editFields, tax_enabled: v })} /></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Tax Inclusive</span><Switch checked={editFields.tax_inclusive} onCheckedChange={(v) => setEditFields({ ...editFields, tax_inclusive: v })} /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Tax Label</label><Input value={editFields.tax_label || ""} onChange={(e) => setEditFields({ ...editFields, tax_label: e.target.value })} className="mt-1 h-9" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Tax %</label><Input type="number" step="0.01" value={editFields.tax_percent ?? 0} onChange={(e) => setEditFields({ ...editFields, tax_percent: Number(e.target.value) })} className="mt-1 h-9" /></div>
                </div>
              </div>
              {/* Surcharge */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Surcharge</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between"><span className="text-sm">Surcharge Enabled</span><Switch checked={editFields.surcharge_enabled} onCheckedChange={(v) => setEditFields({ ...editFields, surcharge_enabled: v })} /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Label</label><Input value={editFields.surcharge_label || ""} onChange={(e) => setEditFields({ ...editFields, surcharge_label: e.target.value })} className="mt-1 h-9" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Surcharge %</label><Input type="number" step="0.01" value={editFields.surcharge_percent ?? 0} onChange={(e) => setEditFields({ ...editFields, surcharge_percent: Number(e.target.value) })} className="mt-1 h-9" /></div>
                </div>
              </div>
              {/* Notes */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Internal Notes</h4>
                <div><label className="text-xs font-medium text-muted-foreground">CRM Notes</label><Textarea value={editFields.crm_notes || ""} onChange={(e) => setEditFields({ ...editFields, crm_notes: e.target.value })} className="mt-1" rows={2} /></div>
                <div className="mt-2"><label className="text-xs font-medium text-muted-foreground">Feature Requests</label><Textarea value={editFields.feature_request_notes || ""} onChange={(e) => setEditFields({ ...editFields, feature_request_notes: e.target.value })} className="mt-1" rows={2} /></div>
                <div className="mt-2"><label className="text-xs font-medium text-muted-foreground">Support Notes</label><Textarea value={editFields.support_notes || ""} onChange={(e) => setEditFields({ ...editFields, support_notes: e.target.value })} className="mt-1" rows={2} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => saveOrg.mutate()} disabled={saveOrg.isPending}>Save Changes</Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </div>
          ) : org ? (
            <div className="space-y-1.5 text-sm">
              <InfoRow label="Plan"><Badge variant="secondary" className="capitalize text-xs">{org.plan}</Badge></InfoRow>
              <InfoRow label="Status"><Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize text-xs">{org.status}</Badge></InfoRow>
              <InfoRow label="Onboarding"><Badge variant="outline" className="capitalize text-xs">{(org as any).onboarding_stage || "new"}</Badge></InfoRow>
              <InfoRow label="Health"><Badge className={`text-xs capitalize ${healthColors[(org as any).health_status] || ""}`}>{((org as any).health_status || "healthy").replace("_", " ")}</Badge></InfoRow>
              <InfoRow label="Churn Risk"><Badge variant="outline" className={`text-xs capitalize ${churnColors[(org as any).churn_risk] || ""}`}>{(org as any).churn_risk || "low"}</Badge></InfoRow>
              <InfoRow label="Assigned Owner">{(org as any).assigned_owner || <span className="text-muted-foreground">Unassigned</span>}</InfoRow>
              <InfoRow label="Source">{(org as any).source || <span className="text-muted-foreground">—</span>}</InfoRow>
              <InfoRow label="Follow-up">{(org as any).follow_up_date ? format(new Date((org as any).follow_up_date), "PP") : <span className="text-muted-foreground">None</span>}</InfoRow>
              <InfoRow label="Tax">{org.tax_enabled ? `${org.tax_percent}% ${org.tax_label}${org.tax_inclusive ? " (inclusive)" : ""}` : "Disabled"}</InfoRow>
              <InfoRow label="Surcharge">{org.surcharge_enabled ? `${org.surcharge_percent}% ${org.surcharge_label}` : "Disabled"}</InfoRow>
              <InfoRow label="Subscription">{org.subscription_status}</InfoRow>
              {(org as any).crm_notes && <div className="pt-2 border-t border-border mt-2"><p className="text-xs text-muted-foreground font-medium">CRM Notes</p><p className="text-xs mt-1">{(org as any).crm_notes}</p></div>}
            </div>
          ) : null}
        </div>

        {/* Usage Metrics */}
        <div className={section}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4" />Usage Metrics</h3>
          <div className="space-y-2 text-sm">
            <InfoRow label="Last Order">{usage?.lastOrder ? formatDistanceToNow(new Date(usage.lastOrder), { addSuffix: true }) : <span className="text-muted-foreground">Never</span>}</InfoRow>
            <InfoRow label="Last Booking">{usage?.lastBooking ? formatDistanceToNow(new Date(usage.lastBooking), { addSuffix: true }) : <span className="text-muted-foreground">Never</span>}</InfoRow>
            <InfoRow label="Last Event">{usage?.lastEvent ? formatDistanceToNow(new Date(usage.lastEvent), { addSuffix: true }) : <span className="text-muted-foreground">Never</span>}</InfoRow>
            <InfoRow label="Tax Configured">{usage?.taxConfigured ? <Badge variant="default" className="text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</InfoRow>
            <InfoRow label="Surcharge Configured">{usage?.surchargeConfigured ? <Badge variant="default" className="text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</InfoRow>
            <InfoRow label="Last Active">{(org as any)?.last_active_at ? formatDistanceToNow(new Date((org as any).last_active_at), { addSuffix: true }) : <span className="text-muted-foreground">Unknown</span>}</InfoRow>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className={section}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Members ({members?.length || 0})</h3>
          <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)} className="text-xs h-7"><Plus className="h-3 w-3 mr-1" />Add Member</Button>
        </div>
        {members?.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3"><AlertTriangle className="h-4 w-4 shrink-0" /><span>No members in this organization.</span></div>
        ) : (
          <div className="space-y-1">
            {members?.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30">
                <span className="text-sm font-medium">{m.full_name}</span>
                <div className="flex items-center gap-2">
                  <Select value={m.role} onValueChange={(v) => changeOrgRole.mutate({ userId: m.user_id, newRole: v })}>
                    <SelectTrigger className="h-7 w-24 text-xs border"><SelectValue /></SelectTrigger>
                    <SelectContent>{orgRoles.map((r) => <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(`Remove ${m.full_name}?`)) removeMember.mutate(m.user_id); }}><Unlink className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Timeline */}
      <div className={section}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Notes & Timeline</h3>
        <div className="flex gap-2 mb-3">
          <Select value={newNoteType} onValueChange={setNewNoteType}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{noteTypes.map((t) => <SelectItem key={t} value={t} className="capitalize text-xs">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note…" className="flex-1 h-9 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addNote.mutate()} />
          <Button size="sm" onClick={() => addNote.mutate()} disabled={addNote.isPending || !newNote.trim()}><Send className="h-3.5 w-3.5" /></Button>
        </div>
        {(!notes || notes.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notes.map((n: any) => (
              <div key={n.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{n.note_type.replace("_", " ")}</Badge>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-foreground">{n.content}</p>
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
            <div><label className="text-xs font-medium text-muted-foreground">User</label>
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>{availableUsers.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0, 8)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{orgRoles.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
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
  const [filterHealth, setFilterHealth] = useState<string>("all");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*, organization_members(count)").order("created_at", { ascending: false });
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
    return <AdminLayout><OrgDetailView orgId={selectedOrgId} onBack={() => setSelectedOrgId(null)} /></AdminLayout>;
  }

  let filtered = orgs?.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase()) ||
    o.plan.toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase())
  );

  if (filterHealth !== "all") {
    filtered = filtered?.filter((o) => (o as any).health_status === filterHealth);
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{orgs?.length || 0} organizations · Click any for CRM details</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, plan, status..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "healthy", "warning", "at_risk", "churned"].map((h) => (
              <Button key={h} variant={filterHealth === h ? "default" : "outline"} size="sm" onClick={() => setFilterHealth(h)} className="text-xs h-8 capitalize">
                {h === "all" ? "All" : h.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
          ) : filtered?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No organizations found.</p>
          ) : (
            filtered?.map((org) => (
              <div key={org.id} onClick={() => setSelectedOrgId(org.id)} className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Building2 className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{org.name}</span>
                    <Badge variant="secondary" className="capitalize text-[10px] h-5">{org.plan}</Badge>
                    <Badge variant={org.status === "active" ? "default" : "destructive"} className="capitalize text-[10px] h-5">{org.status}</Badge>
                    <Badge className={`text-[10px] h-5 capitalize ${healthColors[(org as any).health_status] || healthColors.healthy}`}>
                      {((org as any).health_status || "healthy").replace("_", " ")}
                    </Badge>
                    {(org as any).churn_risk === "high" && <Badge variant="outline" className="text-[10px] h-5 text-destructive border-destructive/30"><TrendingDown className="h-3 w-3 mr-0.5" />High Risk</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{org.slug}</span>
                    <span>{(org as any).organization_members?.[0]?.count ?? 0} members</span>
                    <span className="hidden sm:inline capitalize">{(org as any).onboarding_stage || "new"}</span>
                    <span className="hidden sm:inline">{new Date(org.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(org.id); toast.success("Org ID copied"); }}><Copy className="h-4 w-4 mr-2" />Copy Org ID</DropdownMenuItem>
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
