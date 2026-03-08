import { AppLayout } from "@/components/layout/AppLayout";
import {
  Users as UsersIcon, AlertTriangle, Clock, Shield, Eye, Plus, Pencil,
  Trash2, X, Save, Calendar, Loader2,
} from "lucide-react";
import { useState } from "react";
import { useStaffMembers, useCreateStaffMember, useUpdateStaffMember, useDeleteStaffMember } from "@/hooks/useStaffMembers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
export default function Staff() {
  const { user } = useAuth();
  const { isOwner, canManage } = useRoleAccess();
  const { data: staff, isLoading } = useStaffMembers();
  const createStaff = useCreateStaffMember();
  const updateStaff = useUpdateStaffMember();
  const deleteStaff = useDeleteStaffMember();
  const qc = useQueryClient();

  // Team roles data (owner/manager only)
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ["team_roles"],
    enabled: isOwner,
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("*");
      if (!roles) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
      return roles.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.user_id === r.user_id),
      }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "owner" | "manager" | "staff" }) => {
      const { error } = await supabase.from("user_roles").update({ role }).eq("id", id);
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
  const [tab, setTab] = useState<"roster" | "schedule">("roster");
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", hourly_rate: "", status: "active" });

  // Schedule assign form
  const [scheduleForm, setScheduleForm] = useState({ staff_id: "", event_id: "", role: "crew" });

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
              <Button size="sm" onClick={() => { resetForm(); setAddingNew(true); }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Staff
              </Button>
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

        {/* Schedule Tab */}
        {tab === "schedule" && (
          <div className="space-y-6">
            {/* Assign Staff to Event */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Assign Staff to Event
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Staff Member</label>
                  <select
                    value={scheduleForm.staff_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, staff_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Select staff...</option>
                    {staff?.filter((s) => s.status === "active").map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event</label>
                  <select
                    value={scheduleForm.event_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, event_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Select event...</option>
                    {events?.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} {e.event_date ? `(${format(parseISO(e.event_date), "MMM d")})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <Input
                    value={scheduleForm.role}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, role: e.target.value })}
                    placeholder="crew, lead, driver..."
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      if (!scheduleForm.staff_id || !scheduleForm.event_id) {
                        toast.error("Select both a staff member and event");
                        return;
                      }
                      assignStaff.mutate(scheduleForm, {
                        onSuccess: () => setScheduleForm({ staff_id: "", event_id: "", role: "crew" }),
                      });
                    }}
                    disabled={assignStaff.isPending}
                    className="gap-1.5 w-full"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {assignStaff.isPending ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Current Assignments */}
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="text-xs font-semibold text-muted-foreground">Current Assignments</h3>
              </div>
              {!assignments?.length ? (
                <div className="py-12 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No assignments yet. Assign staff to events above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Staff", "Event", "Date", "Role", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a: any) => (
                        <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-card-foreground">{a.staff_members?.name || "—"}</td>
                          <td className="px-4 py-3 text-card-foreground">{a.events?.name || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {a.events?.event_date ? format(parseISO(a.events.event_date), "MMM d, yyyy") : "TBD"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                              {a.role || "crew"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => unassignStaff.mutate(a.id)}
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
