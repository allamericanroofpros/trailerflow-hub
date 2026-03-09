import { AppLayout } from "@/components/layout/AppLayout";
import { TeamInvitePanel } from "@/components/onboarding/TeamInvitePanel";
import {
  Users as UsersIcon, AlertTriangle, Clock, Shield, Eye, Plus, Pencil,
  Trash2, X, Save, Calendar, Loader2, ChevronLeft, ChevronRight, UserPlus, CalendarClock, Sparkles, Lock,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useStaffMembers, useCreateStaffMember, useUpdateStaffMember, useDeleteStaffMember } from "@/hooks/useStaffMembers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useOrgId } from "@/hooks/useOrgId";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradeModal } from "@/components/UpgradeModal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

export default function Staff() {
  const { user } = useAuth();
  const { isOwner, canManage } = useRoleAccess();
  const orgId = useOrgId();
  const ent = useEntitlements();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { data: staff, isLoading } = useStaffMembers();
  const createStaff = useCreateStaffMember();
  const updateStaff = useUpdateStaffMember();
  const deleteStaff = useDeleteStaffMember();
  const qc = useQueryClient();

  // Team roles data scoped to current org
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ["team_roles", orgId],
    enabled: isOwner && !!orgId,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("organization_members")
        .select("*")
        .eq("org_id", orgId!);
      if (!members || members.length === 0) return [];
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone, avatar_url").in("user_id", userIds);
      // Get staff_members to find trailer assignments
      const { data: staffRows } = await supabase.from("staff_members").select("id, user_id, name").eq("org_id", orgId!).not("user_id", "is", null);
      // Get trailers for the org
      const { data: trailers } = await supabase.from("trailers").select("id, name").eq("org_id", orgId!);
      // Get event_staff → events to find trailer associations per staff
      const { data: eventStaffRows } = await supabase.from("event_staff").select("staff_id, events(trailer_id)").eq("org_id", orgId!);
      // Build a map: user_id → trailer names
      const staffIdByUserId: Record<string, string> = {};
      staffRows?.forEach((s) => { if (s.user_id) staffIdByUserId[s.user_id] = s.id; });
      const trailerMap: Record<string, Set<string>> = {};
      eventStaffRows?.forEach((es: any) => {
        if (es.events?.trailer_id) {
          if (!trailerMap[es.staff_id]) trailerMap[es.staff_id] = new Set();
          const trailer = trailers?.find((t) => t.id === es.events.trailer_id);
          if (trailer) trailerMap[es.staff_id].add(trailer.name);
        }
      });
      return members.map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id),
        trailerNames: Object.entries(staffIdByUserId)
          .filter(([uid]) => uid === m.user_id)
          .flatMap(([, staffId]) => Array.from(trailerMap[staffId] || [])),
      }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "owner" | "manager" | "staff" }) => {
      const { error } = await supabase.from("organization_members").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_roles"] });
      toast.success("Role updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Events for scheduling
  const { data: events } = useQuery({
    queryKey: ["events_for_scheduling"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name, event_date, start_time, end_time, stage")
        .in("stage", ["confirmed", "tentative", "applied"])
        .order("event_date");
      return data || [];
    },
  });

  // Event-staff assignments
  const { data: assignments } = useQuery({
    queryKey: ["event_staff"],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_staff")
        .select("*, events(name, event_date), staff_members(name)");
      return data || [];
    },
  });

  const assignStaff = useMutation({
    mutationFn: async ({ staff_id, event_id, role }: { staff_id: string; event_id: string; role?: string }) => {
      const { error } = await supabase.from("event_staff").insert({ staff_id, event_id, role: role || "crew" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event_staff"] });
      toast.success("Staff assigned to event");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unassignStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event_staff"] });
      toast.success("Assignment removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // UI state
  const [tab, setTab] = useState<"roles" | "roster" | "schedule" | "availability">(isOwner ? "roles" : "roster");
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", hourly_rate: "", status: "active" });
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Schedule assign form
  const [scheduleForm, setScheduleForm] = useState({ staff_id: "", event_id: "", role: "crew" });

  // Create account form
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ full_name: "", email: "", password: "", role: "staff" });
  const [creatingAccount, setCreatingAccount] = useState(false);

  const handleCreateAccount = async () => {
    if (!accountForm.full_name.trim()) return toast.error("Name is required");
    if (!accountForm.email.trim()) return toast.error("Email is required");
    if (accountForm.password.length < 6) return toast.error("Password must be at least 6 characters");

    setCreatingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-team-member", {
        body: {
          full_name: accountForm.full_name.trim(),
          email: accountForm.email.trim().toLowerCase(),
          password: accountForm.password,
          role: accountForm.role,
        },
      });
      if (res.error) throw new Error(res.error.message || "Failed to create account");
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`Account created for ${accountForm.full_name}! They can sign in with their email and password.`);
      setAccountForm({ full_name: "", email: "", password: "", role: "staff" });
      setShowCreateAccount(false);
      qc.invalidateQueries({ queryKey: ["team_roles"] });
      qc.invalidateQueries({ queryKey: ["staff_members"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingAccount(false);
    }
  };

  // Build week days for calendar
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Build staff-event calendar data
  const calendarData = useMemo(() => {
    if (!staff || !assignments || !events) return [];
    const activeStaff = staff.filter((s) => s.status === "active");
    return activeStaff.map((s) => {
      const staffAssignments = assignments.filter((a: any) => a.staff_id === s.id);
      const dayMap: Record<string, { eventName: string; eventId: string; assignmentId: string; role: string; stage: string; startTime?: string; endTime?: string }[]> = {};
      weekDays.forEach((d) => { dayMap[format(d, "yyyy-MM-dd")] = []; });
      staffAssignments.forEach((a: any) => {
        const evt = events.find((e) => e.id === a.event_id);
        if (!evt?.event_date) return;
        const key = evt.event_date;
        if (dayMap[key]) {
          dayMap[key].push({
            eventName: evt.name,
            eventId: evt.id,
            assignmentId: a.id,
            role: a.role || "crew",
            stage: evt.stage,
            startTime: evt.start_time || undefined,
            endTime: evt.end_time || undefined,
          });
        }
      });
      return { staff: s, dayMap };
    });
  }, [staff, assignments, events, weekDays]);

  // Count staff per day for overlap detection
  const staffCountByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    weekDays.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      counts[key] = calendarData.filter((row) => row.dayMap[key]?.length > 0).length;
    });
    return counts;
  }, [calendarData, weekDays]);

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", hourly_rate: "", status: "active" });
    setAddingNew(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : 0,
      status: form.status,
    };
    if (editingId) {
      updateStaff.mutate({ id: editingId, ...payload }, { onSuccess: resetForm });
    } else {
      createStaff.mutate(payload, { onSuccess: resetForm });
    }
  };

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      email: m.email || "",
      phone: m.phone || "",
      hourly_rate: m.hourly_rate?.toString() || "",
      status: m.status,
    });
    setAddingNew(true);
  };

  const totalStaff = staff?.length || 0;
  const activeStaff = staff?.filter((s) => s.status === "active").length || 0;
  const totalAssignments = assignments?.length || 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your staff, roles, and event scheduling.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              {([
                ...(isOwner ? [{ key: "roles" as const, label: "Roles", icon: Shield }] : []),
                { key: "roster" as const, label: "Roster", icon: UsersIcon },
                { key: "availability" as const, label: "Availability", icon: CalendarClock },
                { key: "schedule" as const, label: "Schedule", icon: Calendar },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "roster" && canManage("staff") && (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!ent.canAddStaff) {
                      setShowUpgrade(true);
                      return;
                    }
                    resetForm(); setAddingNew(true);
                  }}
                  className="gap-1.5"
                  variant={ent.canAddStaff ? "default" : "outline"}
                >
                  {ent.canAddStaff ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  Add Staff
                  {!ent.canAddStaff && <span className="text-xs text-muted-foreground ml-1">({ent.staffCount}/{ent.maxStaff})</span>}
                </Button>
                <UpgradeModal
                  open={showUpgrade}
                  onOpenChange={setShowUpgrade}
                  feature="More Staff Members"
                  currentPlan={ent.currentPlan}
                  requiredPlan={ent.suggestedUpgrade || "pro"}
                />
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Staff", value: totalStaff.toString() },
            { label: "Active", value: activeStaff.toString() },
            { label: "Event Assignments", value: totalAssignments.toString() },
            { label: "On Leave", value: (staff?.filter((s) => s.status !== "active").length || 0).toString(), alert: true },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.alert ? "text-warning" : "text-card-foreground"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {addingNew && (
          <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">
              {editingId ? "Edit Staff Member" : "Add Staff Member"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hourly Rate ($)</label>
                <Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleSave} disabled={createStaff.isPending || updateStaff.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {createStaff.isPending || updateStaff.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Roles Tab (Owner only) */}
        {tab === "roles" && isOwner && (
          <div className="space-y-4">
            {/* Create Account Section */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-card-foreground">Create Team Account</h3>
                </div>
                {!showCreateAccount && (
                  <Button size="sm" onClick={() => setShowCreateAccount(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> New Account
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Create login accounts for your team. They'll sign in with the email and password you set. If their email matches a roster entry, they'll be auto-linked.
              </p>

              {showCreateAccount && (
                <div className="rounded-lg border border-primary/20 bg-background p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                      <Input value={accountForm.full_name} onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })} className="mt-1 h-10" placeholder="Jane Rivera" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Email *</label>
                      <Input type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} className="mt-1 h-10" placeholder="jane@example.com" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Password *</label>
                      <Input type="password" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} className="mt-1 h-10" placeholder="Min 6 characters" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Role</label>
                      <select
                        value={accountForm.role}
                        onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none h-10"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleCreateAccount} disabled={creatingAccount} className="gap-1.5">
                      {creatingAccount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {creatingAccount ? "Creating..." : "Create Account"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowCreateAccount(false); setAccountForm({ full_name: "", email: "", password: "", role: "staff" }); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Existing Roles Management */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">User Roles & Permissions</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                <strong>Owner</strong> = full access. <strong>Manager</strong> = manage operations (no role changes or deletions). <strong>Staff</strong> = POS, calendar, and basic views only.
              </p>
              {teamLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading team...
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl">
                  {teamMembers?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.profile?.full_name || "Unnamed User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.trailerNames?.length > 0
                            ? `Trailers: ${member.trailerNames.join(", ")}`
                            : member.profile?.phone || "No trailer assigned"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.user_id === user?.id ? (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {member.role} (you)
                          </span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value as "owner" | "manager" | "staff" })}
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                          >
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!teamMembers || teamMembers.length === 0) && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No team members yet. Create an account above to get started.</p>
                  )}
                </div>
              )}
            </div>

            {/* Team Invite Panel */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <TeamInvitePanel />
            </div>
          </div>
        )}

        {/* Roster Tab */}
        {tab === "roster" && (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !staff?.length ? (
              <div className="py-12 text-center">
                <UsersIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No staff members yet. Click "Add Staff" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {["Name", "Email", "Phone", "Rate", "Status", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-card-foreground">{m.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.email || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.phone || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.hourly_rate ? `$${m.hourly_rate}/hr` : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            m.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          }`}>
                            {m.status === "active" ? "Active" : m.status === "on_leave" ? "On Leave" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(m)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${m.name}?`)) deleteStaff.mutate(m.id);
                              }}
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Availability Tab */}
        {tab === "availability" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">Staff Availability</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Each team member can set their weekly availability. Click a day to toggle available/unavailable, then set start/end times.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !staff?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No staff members yet.</p>
              ) : (
                <div className="space-y-6">
                  {staff.filter(s => s.status === "active").map(member => {
                    const avail: Record<string, { start: string; end: string }> = (member.availability && typeof member.availability === "object" && !Array.isArray(member.availability))
                      ? member.availability as Record<string, { start: string; end: string }>
                      : {};

                    const toggleDay = async (day: string) => {
                      const newAvail = { ...avail };
                      if (newAvail[day]) {
                        delete newAvail[day];
                      } else {
                        newAvail[day] = { start: "09:00", end: "21:00" };
                      }
                      try {
                        await supabase.from("staff_members").update({ availability: newAvail as any }).eq("id", member.id);
                        qc.invalidateQueries({ queryKey: ["staff_members"] });
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    };

                    const updateTime = async (day: string, field: "start" | "end", value: string) => {
                      const newAvail = { ...avail };
                      if (!newAvail[day]) newAvail[day] = { start: "09:00", end: "21:00" };
                      newAvail[day][field] = value;
                      try {
                        await supabase.from("staff_members").update({ availability: newAvail as any }).eq("id", member.id);
                        qc.invalidateQueries({ queryKey: ["staff_members"] });
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    };

                    return (
                      <div key={member.id} className="rounded-lg border border-border bg-background p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-card-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.hourly_rate ? `$${member.hourly_rate}/hr` : "No rate set"}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {Object.keys(avail).length} days available
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                          {DAYS.map(day => {
                            const dayAvail = avail[day];
                            return (
                              <div key={day} className={`rounded-lg border-2 p-2.5 text-center transition-all ${
                                dayAvail ? "border-success/40 bg-success/5" : "border-border bg-muted/20 opacity-60"
                              }`}>
                                <button
                                  onClick={() => toggleDay(day)}
                                  className="w-full text-xs font-bold text-card-foreground mb-1.5 touch-manipulation hover:text-primary transition-colors"
                                >
                                  {day.slice(0, 3)}
                                </button>
                                {dayAvail ? (
                                  <div className="space-y-1">
                                    <select
                                      value={dayAvail.start}
                                      onChange={e => updateTime(day, "start", e.target.value)}
                                      className="w-full text-[10px] rounded border border-border bg-background px-1 py-0.5"
                                    >
                                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select
                                      value={dayAvail.end}
                                      onChange={e => updateTime(day, "end", e.target.value)}
                                      className="w-full text-[10px] rounded border border-border bg-background px-1 py-0.5"
                                    >
                                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground">Off</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Schedule Suggestion */}
            {canManage("staff") && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-card-foreground">AI Schedule Assistant</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Based on staff availability and upcoming events, AI can suggest tentative schedules. Assign staff from the Schedule tab, or let AI generate a draft.
                </p>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    toast.info("AI scheduling coming soon! For now, use the Schedule tab to manually assign staff based on their availability.");
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Suggest Schedule
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab - Calendar View */}
        {tab === "schedule" && (
          <div className="space-y-4">
            {/* Assign Staff to Event - Compact */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Quick Assign
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select
                  value={scheduleForm.staff_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, staff_id: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="">Staff...</option>
                  {staff?.filter((s) => s.status === "active").map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  value={scheduleForm.event_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, event_id: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="">Event...</option>
                  {events?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} {e.event_date ? `(${format(parseISO(e.event_date), "M/d")})` : ""}
                    </option>
                  ))}
                </select>
                <Input
                  value={scheduleForm.role}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, role: e.target.value })}
                  placeholder="Role (crew, lead...)"
                  className="h-[38px]"
                />
                <Button
                  onClick={() => {
                    if (!scheduleForm.staff_id || !scheduleForm.event_id) {
                      toast.error("Select both staff and event");
                      return;
                    }
                    assignStaff.mutate(scheduleForm, {
                      onSuccess: () => setScheduleForm({ staff_id: "", event_id: "", role: "crew" }),
                    });
                  }}
                  disabled={assignStaff.isPending}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign
                </Button>
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <span className="text-sm font-semibold text-card-foreground">
                  {format(weekDays[0], "MMM d")} — {format(weekDays[6], "MMM d, yyyy")}
                </span>
                <Button variant="ghost" size="sm" className="ml-2 text-xs" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                  Today
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              {/* Desktop: full grid */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-[140px] sticky left-0 bg-muted/50 z-10">Staff</th>
                      {weekDays.map((d) => {
                        const key = format(d, "yyyy-MM-dd");
                        const isToday = isSameDay(d, new Date());
                        const count = staffCountByDay[key] || 0;
                        return (
                          <th key={key} className={`px-2 py-2.5 text-center text-xs font-semibold min-w-[120px] ${isToday ? "bg-primary/5" : ""}`}>
                            <div className={`${isToday ? "text-primary" : "text-muted-foreground"}`}>
                              {format(d, "EEE")}
                            </div>
                            <div className={`text-base font-bold mt-0.5 ${isToday ? "text-primary" : "text-card-foreground"}`}>
                              {format(d, "d")}
                            </div>
                            {count > 0 && (
                              <div className={`text-[10px] mt-0.5 ${count >= 3 ? "text-success" : count >= 2 ? "text-warning" : "text-muted-foreground"}`}>
                                {count} staff
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No active staff. Add team members in the Roster tab.</p>
                        </td>
                      </tr>
                    ) : (
                      calendarData.map((row) => (
                        <tr key={row.staff.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 sticky left-0 bg-card z-10 border-r border-border">
                            <div className="font-medium text-card-foreground text-xs truncate max-w-[130px]">{row.staff.name}</div>
                            {row.staff.hourly_rate ? (
                              <div className="text-[10px] text-muted-foreground">${row.staff.hourly_rate}/hr</div>
                            ) : null}
                          </td>
                          {weekDays.map((d) => {
                            const key = format(d, "yyyy-MM-dd");
                            const dayEvents = row.dayMap[key] || [];
                            const isToday = isSameDay(d, new Date());
                            return (
                              <td key={key} className={`px-1 py-1.5 align-top min-w-[120px] ${isToday ? "bg-primary/5" : ""}`}>
                                {dayEvents.length > 0 ? (
                                  <div className="space-y-1">
                                    {dayEvents.map((evt) => {
                                      const stageColors: Record<string, string> = {
                                        confirmed: "bg-success/15 text-success border-success/30",
                                        tentative: "bg-warning/15 text-warning border-warning/30",
                                        applied: "bg-info/15 text-info border-info/30",
                                        lead: "bg-muted text-muted-foreground border-border",
                                      };
                                      const color = stageColors[evt.stage] || "bg-secondary text-secondary-foreground border-border";
                                      return (
                                        <div
                                          key={evt.assignmentId}
                                          className={`rounded-md border px-2 py-1.5 text-[10px] leading-tight ${color} group relative`}
                                        >
                                          <div className="font-semibold truncate">{evt.eventName}</div>
                                          <div className="opacity-70">{evt.role}</div>
                                          {evt.startTime && (
                                            <div className="opacity-60 mt-0.5">{evt.startTime?.slice(0, 5)}{evt.endTime ? `–${evt.endTime.slice(0, 5)}` : ""}</div>
                                          )}
                                          <button
                                            onClick={() => unassignStaff.mutate(evt.assignmentId)}
                                            className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px]"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile: day-by-day cards */}
              <div className="md:hidden divide-y divide-border">
                {weekDays.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const isToday = isSameDay(d, new Date());
                  const dayAssignments = calendarData.flatMap((row) =>
                    (row.dayMap[key] || []).map((evt) => ({ ...evt, staffName: row.staff.name }))
                  );
                  return (
                    <div key={key} className={`p-3 ${isToday ? "bg-primary/5" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-card-foreground"}`}>
                          {format(d, "EEE, MMM d")}
                        </span>
                        {dayAssignments.length > 0 && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            dayAssignments.length >= 3 ? "bg-success/10 text-success" : dayAssignments.length >= 2 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                          }`}>
                            {dayAssignments.length} assigned
                          </span>
                        )}
                      </div>
                      {dayAssignments.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50">No staff scheduled</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dayAssignments.map((evt) => {
                            const stageColors: Record<string, string> = {
                              confirmed: "bg-success/15 text-success border-success/30",
                              tentative: "bg-warning/15 text-warning border-warning/30",
                              applied: "bg-info/15 text-info border-info/30",
                            };
                            const color = stageColors[evt.stage] || "bg-secondary text-secondary-foreground border-border";
                            return (
                              <div key={evt.assignmentId} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${color}`}>
                                <div>
                                  <span className="text-xs font-semibold">{evt.staffName}</span>
                                  <span className="text-xs opacity-70 ml-2">{evt.eventName}</span>
                                  {evt.startTime && (
                                    <span className="text-[10px] opacity-60 ml-1">{evt.startTime.slice(0, 5)}</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => unassignStaff.mutate(evt.assignmentId)}
                                  className="p-1 rounded hover:bg-destructive/10 text-current"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overlap Warnings */}
            {(() => {
              const overlaps: { date: string; events: string[] }[] = [];
              weekDays.forEach((d) => {
                const key = format(d, "yyyy-MM-dd");
                const allEventsOnDay = new Set<string>();
                calendarData.forEach((row) => {
                  row.dayMap[key]?.forEach((evt) => allEventsOnDay.add(evt.eventName));
                });
                if (allEventsOnDay.size > 1) {
                  overlaps.push({ date: format(d, "EEE, MMM d"), events: Array.from(allEventsOnDay) });
                }
              });
              if (overlaps.length === 0) return null;
              return (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-semibold text-warning">Overlap Detected</span>
                  </div>
                  <div className="space-y-1">
                    {overlaps.map((o) => (
                      <p key={o.date} className="text-xs text-muted-foreground">
                        <strong>{o.date}:</strong> {o.events.join(" & ")} — staff split across multiple events
                      </p>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
