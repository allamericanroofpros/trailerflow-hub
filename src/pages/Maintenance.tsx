import { AppLayout } from "@/components/layout/AppLayout";
import { Wrench, CheckCircle, Clock, Plus, Save, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useMaintenanceRecords, useCreateMaintenanceRecord, useUpdateMaintenanceRecord } from "@/hooks/useMaintenanceRecords";
import { useTrailers } from "@/hooks/useTrailers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function Maintenance() {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_records"] }),
  });

  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      trailer_id: r.trailer_id, title: r.title, type: r.type,
      description: r.description || "", due_date: r.due_date || "",
      status: r.status, cost: r.cost?.toString() || "",
    });
    setAddingNew(true);
  };

  const stats = useMemo(() => {
    if (!records) return { pending: 0, inProgress: 0, completed: 0, totalCost: 0 };
    return {
      pending: records.filter(r => r.status === "pending").length,
      inProgress: records.filter(r => r.status === "in_progress").length,
      completed: records.filter(r => r.status === "completed").length,
      totalCost: records.reduce((s, r) => s + (r.cost || 0), 0),
    };
  }, [records]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
            <p className="text-sm text-muted-foreground mt-1">Track maintenance tasks, inspections, and repairs for your fleet.</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setAddingNew(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Record
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Pending", value: stats.pending.toString(), icon: Clock, color: "text-warning" },
            { label: "In Progress", value: stats.inProgress.toString(), icon: Wrench, color: "text-info" },
            { label: "Completed", value: stats.completed.toString(), icon: CheckCircle, color: "text-success" },
            { label: "Total Cost", value: `$${stats.totalCost.toLocaleString()}`, icon: Wrench, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {addingNew && (
          <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">
              {editingId ? "Edit Record" : "New Maintenance Record"}
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
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Generator service" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="repair">Repair</option>
                  <option value="cleaning">Cleaning</option>
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
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cost ($)</label>
                <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleSave} disabled={createRecord.isPending || updateRecord.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {createRecord.isPending || updateRecord.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">Maintenance Records</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !records?.length ? (
            <div className="py-12 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No maintenance records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Trailer", "Task", "Type", "Due Date", "Status", "Cost", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-card-foreground">{r.trailers?.name || "—"}</td>
                      <td className="px-4 py-3 text-card-foreground">{r.title}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{r.type}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.due_date || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.status === "completed" ? "bg-success/10 text-success"
                          : r.status === "in_progress" ? "bg-info/10 text-info"
                          : "bg-warning/10 text-warning"
                        }`}>{r.status === "in_progress" ? "In Progress" : r.status === "completed" ? "Completed" : "Pending"}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.cost ? `$${r.cost.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
