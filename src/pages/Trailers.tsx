import { AppLayout } from "@/components/layout/AppLayout";
import {
  Truck, Plus, Pencil, Trash2, Save, Loader2, X, DollarSign,
  Users, Clock, Fuel, ChefHat, Info, Sparkles, CheckCircle, AlertTriangle, XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  useTrailers, useCreateTrailer, useUpdateTrailer, useDeleteTrailer,
} from "@/hooks/useTrailers";
import { useTrailerValidation } from "@/hooks/useTrailerValidation";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

type TrailerForm = {
  name: string;
  type: string;
  description: string;
  status: string;
  hourly_cost: string;
  specialties: string;
  avg_ticket: string;
  avg_customers_per_hour: string;
  setup_teardown_hours: string;
  fuel_cost_per_event: string;
  setup_cost_per_event: string;
  staff_required: string;
  staff_hourly_rate: string;
  avg_food_cost_percent: string;
};

const defaultForm: TrailerForm = {
  name: "",
  type: "",
  description: "",
  status: "active",
  hourly_cost: "",
  specialties: "",
  avg_ticket: "",
  avg_customers_per_hour: "",
  setup_teardown_hours: "2",
  fuel_cost_per_event: "",
  setup_cost_per_event: "",
  staff_required: "1",
  staff_hourly_rate: "15",
  avg_food_cost_percent: "30",
};

function FieldLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-xs">{tip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default function Trailers() {
  const { data: trailers, isLoading } = useTrailers();
  const createTrailer = useCreateTrailer();
  const updateTrailer = useUpdateTrailer();
  const deleteTrailer = useDeleteTrailer();
  const { user } = useAuth();

  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrailerForm>({ ...defaultForm });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const resetForm = () => {
    setForm({ ...defaultForm });
    setAddingNew(false);
    setEditingId(null);
    setShowAdvanced(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload: any = {
      name: form.name,
      type: form.type || null,
      description: form.description || null,
      status: form.status,
      hourly_cost: form.hourly_cost ? parseFloat(form.hourly_cost) : 0,
      specialties: form.specialties || null,
      avg_ticket: form.avg_ticket ? parseFloat(form.avg_ticket) : 0,
      avg_customers_per_hour: form.avg_customers_per_hour ? parseFloat(form.avg_customers_per_hour) : 0,
      setup_teardown_hours: form.setup_teardown_hours ? parseFloat(form.setup_teardown_hours) : 2,
      fuel_cost_per_event: form.fuel_cost_per_event ? parseFloat(form.fuel_cost_per_event) : 0,
      setup_cost_per_event: form.setup_cost_per_event ? parseFloat(form.setup_cost_per_event) : 0,
      staff_required: form.staff_required ? parseInt(form.staff_required) : 1,
      staff_hourly_rate: form.staff_hourly_rate ? parseFloat(form.staff_hourly_rate) : 15,
      avg_food_cost_percent: form.avg_food_cost_percent ? parseFloat(form.avg_food_cost_percent) : 30,
      owner_id: user!.id,
    };

    if (editingId) {
      const { owner_id, ...updates } = payload;
      updateTrailer.mutate(
        { id: editingId, ...updates },
        {
          onSuccess: () => { resetForm(); toast.success("Trailer updated"); },
          onError: (e: any) => toast.error(e.message),
        }
      );
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
      specialties: t.specialties || "",
      avg_ticket: t.avg_ticket?.toString() || "",
      avg_customers_per_hour: t.avg_customers_per_hour?.toString() || "",
      setup_teardown_hours: t.setup_teardown_hours?.toString() || "2",
      fuel_cost_per_event: t.fuel_cost_per_event?.toString() || "",
      setup_cost_per_event: t.setup_cost_per_event?.toString() || "",
      staff_required: t.staff_required?.toString() || "1",
      staff_hourly_rate: t.staff_hourly_rate?.toString() || "15",
      avg_food_cost_percent: t.avg_food_cost_percent?.toString() || "30",
    });
    setAddingNew(true);
    setShowAdvanced(true);
  };

  const activeCount = trailers?.filter((t) => t.status === "active").length || 0;

  // Calculate a quick profit snapshot for each trailer
  const getProfitSnapshot = (t: any) => {
    const ticket = Number(t.avg_ticket) || 0;
    const custPerHr = Number(t.avg_customers_per_hour) || 0;
    const foodCostPct = Number(t.avg_food_cost_percent) || 30;
    if (!ticket || !custPerHr) return null;
    const revenuePerHour = ticket * custPerHr;
    const profitPerHour = revenuePerHour * (1 - foodCostPct / 100);
    return { revenuePerHour, profitPerHour };
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trailers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your fleet — detailed cost data helps AI calculate real profit estimates.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => { resetForm(); setAddingNew(true); }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Trailer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Trailers", value: (trailers?.length || 0).toString() },
            { label: "Active", value: activeCount.toString() },
            {
              label: "In Maintenance",
              value: (trailers?.filter((t) => t.status === "maintenance").length || 0).toString(),
              alert: true,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.alert ? "text-warning" : "text-card-foreground"}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {addingNew && (
          <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">
              {editingId ? "Edit Trailer" : "New Trailer Setup"}
            </h3>

            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cone Corral"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Input
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="e.g. Mobile Soft Serve"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm outline-none"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="What does this trailer serve? What makes it special?"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Specialties / Best Sellers</label>
                <Input
                  value={form.specialties}
                  onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                  placeholder="e.g. Waffle cones, Sundaes, Shakes"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Toggle advanced */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <DollarSign className="h-3 w-3" />
              {showAdvanced ? "Hide" : "Show"} Cost & Revenue Details
              <span className="text-muted-foreground font-normal ml-1">
                (helps AI calculate real profit)
              </span>
            </button>

            {/* Advanced cost/revenue fields */}
            {showAdvanced && (
              <div className="mt-4 p-4 rounded-lg bg-background border border-border space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Revenue & Costs — Used for AI Profit Calculations
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <FieldLabel
                      label="Avg Ticket ($)"
                      tip="Average amount a customer spends per order at this trailer"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={form.avg_ticket}
                      onChange={(e) => setForm({ ...form, avg_ticket: e.target.value })}
                      placeholder="8.50"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Customers/Hour"
                      tip="Average number of customers you serve per hour at a typical event"
                    />
                    <Input
                      type="number"
                      step="1"
                      value={form.avg_customers_per_hour}
                      onChange={(e) => setForm({ ...form, avg_customers_per_hour: e.target.value })}
                      placeholder="30"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Food Cost %"
                      tip="Percentage of revenue spent on ingredients/supplies (COGS)"
                    />
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={form.avg_food_cost_percent}
                      onChange={(e) => setForm({ ...form, avg_food_cost_percent: e.target.value })}
                      placeholder="30"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Hourly Operating Cost ($)"
                      tip="Cost per hour to run this trailer (propane, electricity, etc.)"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={form.hourly_cost}
                      onChange={(e) => setForm({ ...form, hourly_cost: e.target.value })}
                      placeholder="12.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Staff Required"
                      tip="Number of staff needed to run this trailer at an event"
                    />
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={form.staff_required}
                      onChange={(e) => setForm({ ...form, staff_required: e.target.value })}
                      placeholder="2"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Staff Rate ($/hr)"
                      tip="Average hourly wage for staff running this trailer"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={form.staff_hourly_rate}
                      onChange={(e) => setForm({ ...form, staff_hourly_rate: e.target.value })}
                      placeholder="15.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Setup/Teardown (hrs)"
                      tip="Total hours for setup + teardown (not serving, but billable labor)"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      value={form.setup_teardown_hours}
                      onChange={(e) => setForm({ ...form, setup_teardown_hours: e.target.value })}
                      placeholder="2"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Fuel/Travel Cost ($)"
                      tip="Average fuel and travel cost per event"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={form.fuel_cost_per_event}
                      onChange={(e) => setForm({ ...form, fuel_cost_per_event: e.target.value })}
                      placeholder="40.00"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Profit preview */}
                {Number(form.avg_ticket) > 0 && Number(form.avg_customers_per_hour) > 0 && (
                  <div className="mt-3 rounded-lg bg-success/5 border border-success/20 p-3">
                    <p className="text-xs font-bold text-success mb-1">Quick Profit Preview</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Revenue/hr: </span>
                        <span className="font-bold text-card-foreground">
                          ${(Number(form.avg_ticket) * Number(form.avg_customers_per_hour)).toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gross Profit/hr: </span>
                        <span className="font-bold text-success">
                          ${(
                            Number(form.avg_ticket) *
                            Number(form.avg_customers_per_hour) *
                            (1 - Number(form.avg_food_cost_percent || 30) / 100)
                          ).toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">At 6hr event: </span>
                        <span className="font-bold text-success">
                          ~${(
                            Number(form.avg_ticket) *
                            Number(form.avg_customers_per_hour) *
                            6 *
                            (1 - Number(form.avg_food_cost_percent || 30) / 100) -
                            Number(form.staff_required || 1) *
                              Number(form.staff_hourly_rate || 15) *
                              (6 + Number(form.setup_teardown_hours || 2)) -
                            Number(form.hourly_cost || 0) * 6 -
                            Number(form.fuel_cost_per_event || 0)
                          ).toFixed(0)}{" "}
                          net
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={handleSave}
                disabled={createTrailer.isPending || updateTrailer.isPending}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {createTrailer.isPending || updateTrailer.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Trailer List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !trailers?.length ? (
            <div className="col-span-full py-12 text-center">
              <Truck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No trailers yet. Click "Add Trailer" to get started.
              </p>
            </div>
          ) : (
            trailers.map((t) => {
              const profit = getProfitSnapshot(t);
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-card-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.type || "No type set"}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.status === "active"
                          ? "bg-success/10 text-success"
                          : t.status === "maintenance"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.status === "active"
                        ? "Active"
                        : t.status === "maintenance"
                        ? "Maintenance"
                        : "Inactive"}
                    </span>
                  </div>

                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  {(t as any).specialties && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {((t as any).specialties as string).split(",").map((s: string) => (
                        <span
                          key={s}
                          className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                        >
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick stats row */}
                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
                    {Number((t as any).avg_ticket) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>${Number((t as any).avg_ticket).toFixed(2)} avg ticket</span>
                      </div>
                    )}
                    {Number((t as any).avg_customers_per_hour) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{(t as any).avg_customers_per_hour}/hr</span>
                      </div>
                    )}
                    {profit && (
                      <div className="flex items-center gap-1 text-xs font-bold text-success">
                        <ChefHat className="h-3 w-3" />
                        <span>${profit.profitPerHour.toFixed(0)}/hr gross</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => startEdit(t)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Remove ${t.name}?`)) deleteTrailer.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
