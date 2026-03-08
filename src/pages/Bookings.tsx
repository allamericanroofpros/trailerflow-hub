import { AppLayout } from "@/components/layout/AppLayout";
import { ClipboardList, DollarSign, Check, Clock, Plus, Pencil, Trash2, Save, Loader2, X, Link2, Copy } from "lucide-react";
import { useState } from "react";
import { useBookings, useCreateBooking, useUpdateBooking } from "@/hooks/useBookings";
import { useTrailers } from "@/hooks/useTrailers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrgId } from "@/hooks/useOrgId";

export default function Bookings() {
  const { data: bookings, isLoading } = useBookings();
  const { data: trailers } = useTrailers();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const qc = useQueryClient();

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_name: "", client_email: "", client_phone: "", event_name: "", event_date: "",
    location: "", trailer_id: "", service_package: "", total_price: "", deposit_amount: "",
    deposit_paid: false, guest_count: "", notes: "", status: "pending" as const,
  });

  const resetForm = () => {
    setForm({
      client_name: "", client_email: "", client_phone: "", event_name: "", event_date: "",
      location: "", trailer_id: "", service_package: "", total_price: "", deposit_amount: "",
      deposit_paid: false, guest_count: "", notes: "", status: "pending",
    });
    setAddingNew(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.client_email.trim() || !form.event_name.trim() || !form.event_date) {
      toast.error("Client name, email, event name, and date are required");
      return;
    }
    const payload: any = {
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone || null,
      event_name: form.event_name,
      event_date: form.event_date,
      location: form.location || null,
      trailer_id: form.trailer_id || null,
      service_package: form.service_package || null,
      total_price: form.total_price ? parseFloat(form.total_price) : null,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      deposit_paid: form.deposit_paid,
      guest_count: form.guest_count ? parseInt(form.guest_count) : null,
      notes: form.notes || null,
      status: form.status,
      balance_due: form.total_price
        ? parseFloat(form.total_price) - (form.deposit_paid && form.deposit_amount ? parseFloat(form.deposit_amount) : 0)
        : null,
    };

    if (editingId) {
      updateBooking.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { resetForm(); toast.success("Booking updated"); },
        onError: (e: any) => toast.error(e.message),
      });
    } else {
      createBooking.mutate(payload, {
        onSuccess: () => { resetForm(); toast.success("Booking created"); },
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  const startEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      client_name: b.client_name, client_email: b.client_email, client_phone: b.client_phone || "",
      event_name: b.event_name, event_date: b.event_date, location: b.location || "",
      trailer_id: b.trailer_id || "", service_package: b.service_package || "",
      total_price: b.total_price?.toString() || "", deposit_amount: b.deposit_amount?.toString() || "",
      deposit_paid: b.deposit_paid || false, guest_count: b.guest_count?.toString() || "",
      notes: b.notes || "", status: b.status,
    });
    setAddingNew(true);
  };

  const stats = useMemo(() => {
    if (!bookings) return { pending: 0, confirmed: 0, deposits: 0, balance: 0 };
    return {
      pending: bookings.filter(b => b.status === "pending").length,
      confirmed: bookings.filter(b => b.status === "confirmed").length,
      deposits: bookings.filter(b => b.deposit_paid).reduce((s, b) => s + (b.deposit_amount || 0), 0),
      balance: bookings.reduce((s, b) => s + (b.balance_due || 0), 0),
    };
  }, [bookings]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
         <div>
            <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage client bookings and private events.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const url = `${window.location.origin}/book`;
                navigator.clipboard.writeText(url);
                toast.success("Booking link copied! Share it with clients.");
              }}
            >
              <Link2 className="h-3.5 w-3.5" /> Share Booking Link
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setAddingNew(true); }} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Booking
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Pending", value: stats.pending.toString(), icon: Clock, color: "text-warning" },
            { label: "Confirmed", value: stats.confirmed.toString(), icon: Check, color: "text-success" },
            { label: "Deposits Collected", value: `$${stats.deposits.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
            { label: "Balance Due", value: `$${stats.balance.toLocaleString()}`, icon: ClipboardList, color: "text-info" },
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
              {editingId ? "Edit Booking" : "New Booking"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Name *</label>
                <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Email *</label>
                <Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Phone</label>
                <Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Event Name *</label>
                <Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Event Date *</label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Trailer</label>
                <select value={form.trailer_id} onChange={(e) => setForm({ ...form, trailer_id: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm outline-none">
                  <option value="">Unassigned</option>
                  {trailers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Package</label>
                <Input value={form.service_package} onChange={(e) => setForm({ ...form, service_package: e.target.value })} placeholder="e.g. Premium Sundae Bar" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Guest Count</label>
                <Input type="number" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Total Price ($)</label>
                <Input type="number" step="0.01" value={form.total_price} onChange={(e) => setForm({ ...form, total_price: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Deposit Amount ($)</label>
                <Input type="number" step="0.01" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="mt-1 w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm outline-none">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.deposit_paid} onChange={(e) => setForm({ ...form, deposit_paid: e.target.checked })} className="rounded" />
                  <span className="text-xs font-medium text-muted-foreground">Deposit Paid</span>
                </label>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleSave} disabled={createBooking.isPending || updateBooking.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {createBooking.isPending || updateBooking.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Bookings Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Booking Management</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !bookings?.length ? (
            <div className="py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No bookings yet. Click "New Booking" to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Client", "Event", "Date", "Trailer", "Status", "Total", "Balance", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b: any) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-card-foreground">{b.client_name}</p>
                        <p className="text-xs text-muted-foreground">{b.client_email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.event_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.event_date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.trailers?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.status === "confirmed" ? "bg-success/10 text-success"
                          : b.status === "completed" ? "bg-primary/10 text-primary"
                          : b.status === "cancelled" ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                        }`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-card-foreground">{b.total_price ? `$${b.total_price.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 font-medium text-card-foreground">{b.balance_due ? `$${b.balance_due.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(b)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete booking for ${b.client_name}?`)) deleteBooking.mutate(b.id); }}
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
