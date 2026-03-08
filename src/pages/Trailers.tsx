import { AppLayout } from "@/components/layout/AppLayout";
import { Truck, Plus, Pencil, Trash2, Save, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useTrailers, useCreateTrailer, useUpdateTrailer, useDeleteTrailer } from "@/hooks/useTrailers";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Trailers() {
  const { data: trailers, isLoading } = useTrailers();
  const createTrailer = useCreateTrailer();
  const updateTrailer = useUpdateTrailer();
  const deleteTrailer = useDeleteTrailer();
  const { user } = useAuth();

  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", type: "", description: "", status: "active", hourly_cost: "",
  });

  const resetForm = () => {
    setForm({ name: "", type: "", description: "", status: "active", hourly_cost: "" });
    setAddingNew(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name,
      type: form.type || null,
      description: form.description || null,
      status: form.status,
      hourly_cost: form.hourly_cost ? parseFloat(form.hourly_cost) : 0,
      owner_id: user!.id,
    };
    if (editingId) {
      const { owner_id, ...updates } = payload;
      updateTrailer.mutate({ id: editingId, ...updates }, {
        onSuccess: () => { resetForm(); toast.success("Trailer updated"); },
        onError: (e: any) => toast.error(e.message),
      });
    } else {
      createTrailer.mutate(payload, {
        onSuccess: () => { resetForm(); toast.success("Trailer added"); },
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      type: t.type || "",
      description: t.description || "",
      status: t.status,
      hourly_cost: t.hourly_cost?.toString() || "",
    });
    setAddingNew(true);
  };

  const activeCount = trailers?.filter((t) => t.status === "active").length || 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trailers</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your fleet of trailers and carts.</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setAddingNew(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Trailer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Trailers", value: (trailers?.length || 0).toString() },
            { label: "Active", value: activeCount.toString() },
            { label: "In Maintenance", value: (trailers?.filter((t) => t.status === "maintenance").length || 0).toString(), alert: true },
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
              {editingId ? "Edit Trailer" : "Add Trailer"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sweet Scoops" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Ice Cream Trailer" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hourly Cost ($)</label>
                <Input type="number" step="0.01" value={form.hourly_cost} onChange={(e) => setForm({ ...form, hourly_cost: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleSave} disabled={createTrailer.isPending || updateTrailer.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {createTrailer.isPending || updateTrailer.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Trailer List */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !trailers?.length ? (
            <div className="py-12 text-center">
              <Truck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No trailers yet. Click "Add Trailer" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Name", "Type", "Hourly Cost", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trailers.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-card-foreground">{t.name}</p>
                            {t.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.type || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.hourly_cost ? `$${t.hourly_cost}/hr` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.status === "active" ? "bg-success/10 text-success"
                          : t.status === "maintenance" ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {t.status === "active" ? "Active" : t.status === "maintenance" ? "Maintenance" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(t)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Remove ${t.name}?`)) deleteTrailer.mutate(t.id); }}
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
