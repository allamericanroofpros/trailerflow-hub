import { AppLayout } from "@/components/layout/AppLayout";
import { Wrench, CheckCircle, Clock, Plus, Save, Loader2, Pencil, Trash2, AlertTriangle, CalendarPlus, Filter, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useMaintenanceRecords, useCreateMaintenanceRecord, useUpdateMaintenanceRecord } from "@/hooks/useMaintenanceRecords";
import { useTrailers } from "@/hooks/useTrailers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrgId } from "@/hooks/useOrgId";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, isToday, addDays, parseISO } from "date-fns";
import { SetupGate } from "@/components/shared/SetupGate";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-warning/10 text-warning", icon: Clock },
  { value: "in_progress", label: "In Progress", color: "bg-info/10 text-info", icon: Wrench },
  { value: "completed", label: "Completed", color: "bg-success/10 text-success", icon: CheckCircle },
] as const;

const TYPE_OPTIONS = [
  { value: "maintenance", label: "Maintenance" },
  { value: "inspection", label: "Inspection" },
  { value: "repair", label: "Repair" },
  { value: "cleaning", label: "Cleaning" },
];

export default function Maintenance() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const { data: records, isLoading } = useMaintenanceRecords();
  const { data: trailers } = useTrailers();
  const createRecord = useCreateMaintenanceRecord();
  const updateRecord = useUpdateMaintenanceRecord();
  const qc = useQueryClient();

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance_records"] });
      toast.success("Record deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTrailer, setFilterTrailer] = useState<string>("all");
  const [form, setForm] = useState({
    trailer_id: "", title: "", type: "maintenance", description: "", due_date: "",
    status: "pending", cost: "",
  });

  const resetForm = () => {
    setForm({ trailer_id: "", title: "", type: "maintenance", description: "", due_date: "", status: "pending", cost: "" });
    setAddingNew(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.trailer_id) { toast.error("Title and trailer are required"); return; }
    const payload: any = {
      trailer_id: form.trailer_id,
      title: form.title,
      type: form.type,
      description: form.description || null,
      due_date: form.due_date || null,
      status: form.status,
      cost: form.cost ? parseFloat(form.cost) : null,
      completed_date: form.status === "completed" ? new Date().toISOString().split("T")[0] : null,
      completed_by: form.status === "completed" ? user?.id : null,
      org_id: orgId,
    };

    if (editingId) {
      updateRecord.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { resetForm(); toast.success("Record updated"); },
        onError: (e: any) => toast.error(e.message),
      });
    } else {
      createRecord.mutate(payload, {
        onSuccess: () => { resetForm(); toast.success("Record created"); },
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  const quickStatusChange = (id: string, newStatus: string) => {
    updateRecord.mutate({
      id,
      status: newStatus,
      completed_date: newStatus === "completed" ? new Date().toISOString().split("T")[0] : null,
      completed_by: newStatus === "completed" ? user?.id : null,
    } as any, {
      onSuccess: () => toast.success(`Marked as ${newStatus.replace("_", " ")}`),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      trailer_id: r.trailer_id, title: r.title, type: r.type,
      description: r.description || "", due_date: r.due_date || "",
      status: r.status, cost: r.cost?.toString() || "",
    });
    setAddingNew(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stats = useMemo(() => {
    if (!records) return { pending: 0, inProgress: 0, completed: 0, overdue: 0, totalCost: 0 };
    const today = new Date();
    return {
      pending: records.filter(r => r.status === "pending").length,
      inProgress: records.filter(r => r.status === "in_progress").length,
      completed: records.filter(r => r.status === "completed").length,
      overdue: records.filter(r => r.status !== "completed" && r.due_date && isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date))).length,
      totalCost: records.reduce((s, r) => s + (r.cost || 0), 0),
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter(r => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterTrailer !== "all" && r.trailer_id !== filterTrailer) return false;
      return true;
    });
  }, [records, filterStatus, filterTrailer]);

  const isOverdue = (r: any) => r.status !== "completed" && r.due_date && isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date));
  const isDueSoon = (r: any) => r.status !== "completed" && r.due_date && !isPast(parseISO(r.due_date)) && parseISO(r.due_date) <= addDays(new Date(), 3);

  return (
    <SetupGate requires="trailers" href="/trailers" label="Add Your First Trailer">
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule, track, and complete maintenance tasks for your fleet.</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setAddingNew(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-warning", filter: "pending" },
            { label: "In Progress", value: stats.inProgress, icon: Wrench, color: "text-info", filter: "in_progress" },
            { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-success", filter: "completed" },
            { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-destructive", filter: "overdue" },
            { label: "Total Cost", value: `$${stats.totalCost.toLocaleString()}`, icon: Wrench, color: "text-primary", filter: null },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => s.filter && setFilterStatus(filterStatus === s.filter ? "all" : s.filter)}
              className={`rounded-xl border bg-card p-4 shadow-card text-left transition-all ${
                filterStatus === s.filter ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30"
              } ${s.filter ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
            </button>
          ))}
        </div>

        {/* Add/Edit Form */}
        {addingNew && (
          <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              {editingId ? "Edit Task" : "Schedule Maintenance Task"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Trailer *</label>
                <select value={form.trailer_id} onChange={(e) => setForm({ ...form, trailer_id: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Select trailer...</option>
                  {trailers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Oil change, Deep clean, Permit renewal" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estimated Cost ($)</label>
                <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" placeholder="0.00" />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Notes / Description</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" placeholder="Add details, parts needed, vendor info..." />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleSave} disabled={createRecord.isPending || updateRecord.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {createRecord.isPending || updateRecord.isPending ? "Saving..." : editingId ? "Update" : "Schedule Task"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>
          <select
            value={filterTrailer}
            onChange={(e) => setFilterTrailer(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none"
          >
            <option value="all">All Trailers</option>
            {trailers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map((s) => (
              <button
                key={s.value}
                onClick={() => setFilterStatus(s.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterStatus === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {filterStatus !== "all" && (
            <span className="text-xs text-muted-foreground">{filteredRecords.length} result{filteredRecords.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Task Cards */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredRecords.length ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center shadow-card">
              <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {records?.length ? "No tasks match your filters." : "No maintenance tasks yet. Click \"New Task\" to schedule one."}
              </p>
            </div>
          ) : (
            filteredRecords.map((r: any) => {
              const overdue = isOverdue(r);
              const dueSoon = isDueSoon(r);
              const statusInfo = STATUS_OPTIONS.find(s => s.value === r.status) || STATUS_OPTIONS[0];
              const StatusIcon = statusInfo.icon;
              const nextStatus = r.status === "pending" ? "in_progress" : r.status === "in_progress" ? "completed" : null;
              const nextLabel = r.status === "pending" ? "Start" : r.status === "in_progress" ? "Complete" : null;

              return (
                <div
                  key={r.id}
                  className={`rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-md ${
                    overdue ? "border-destructive/40" : dueSoon ? "border-warning/40" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Quick check-off button */}
                    <button
                      onClick={() => {
                        if (r.status === "completed") return;
                        quickStatusChange(r.id, r.status === "pending" ? "in_progress" : "completed");
                      }}
                      disabled={r.status === "completed"}
                      className={`mt-0.5 shrink-0 rounded-full p-1 transition-all touch-manipulation ${
                        r.status === "completed"
                          ? "text-success cursor-default"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      }`}
                      title={r.status === "completed" ? "Completed" : nextLabel || ""}
                    >
                      {r.status === "completed" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : r.status === "in_progress" ? (
                        <div className="h-5 w-5 rounded-full border-2 border-info flex items-center justify-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-info" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-semibold ${r.status === "completed" ? "line-through text-muted-foreground" : "text-card-foreground"}`}>
                          {r.title}
                        </h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                          {r.type}
                        </span>
                        {overdue && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                          </span>
                        )}
                        {dueSoon && !overdue && (
                          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                            Due Soon
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{(r as any).trailers?.name || "Unknown trailer"}</span>
                        {r.due_date && (
                          <span>Due: {format(parseISO(r.due_date), "MMM d, yyyy")}</span>
                        )}
                        {r.completed_date && (
                          <span className="text-success">Done: {format(parseISO(r.completed_date), "MMM d, yyyy")}</span>
                        )}
                        {r.cost != null && r.cost > 0 && (
                          <span>${Number(r.cost).toLocaleString()}</span>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{r.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {nextStatus && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-8"
                          onClick={() => quickStatusChange(r.id, nextStatus)}
                        >
                          <ArrowRight className="h-3 w-3" /> {nextLabel}
                        </Button>
                      )}
                      <button onClick={() => startEdit(r)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${r.title}"?`)) deleteRecord.mutate(r.id); }}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
    </SetupGate>
  );
}