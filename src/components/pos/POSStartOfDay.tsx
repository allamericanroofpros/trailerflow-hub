import { useState, useMemo } from "react";
import { useInventoryItems } from "@/hooks/useInventory";
import { useEvents } from "@/hooks/useEvents";
import { useTrailers } from "@/hooks/useTrailers";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sun, DollarSign, Package, Truck, Calendar, Users, ChevronRight,
  Loader2, CheckCircle, MapPin, Clock, AlertTriangle, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type Denomination = { label: string; value: number };

const billDenominations: Denomination[] = [
  { label: "$100", value: 100 },
  { label: "$50", value: 50 },
  { label: "$20", value: 20 },
  { label: "$10", value: 10 },
  { label: "$5", value: 5 },
  { label: "$1", value: 1 },
];

const coinDenominations: Denomination[] = [
  { label: "Quarter", value: 0.25 },
  { label: "Dime", value: 0.10 },
  { label: "Nickel", value: 0.05 },
  { label: "Penny", value: 0.01 },
];

type SODStep = "event" | "cash" | "inventory" | "checklist" | "ready";

interface StartOfDayData {
  trailerId: string | null;
  eventId: string | null;
  openingCash: number;
  notes: string;
}

const morningChecklist = [
  "Inspect trailer exterior — tires, hitch, lights",
  "Check propane / gas levels",
  "Verify refrigerator & freezer temps",
  "Turn on & test all cooking equipment",
  "Set up serving window & signage",
  "Stock cups, napkins, utensils at station",
  "Sanitize all food prep surfaces",
  "Test POS / card reader connection",
];

export default function POSStartOfDay({ onComplete }: { onComplete: (data: StartOfDayData) => void }) {
  const { data: events } = useEvents();
  const { data: trailers } = useTrailers();
  const { data: inventoryItems } = useInventoryItems();
  const { data: staffMembers } = useStaffMembers();

  const [step, setStep] = useState<SODStep>("event");
  const [selectedTrailer, setSelectedTrailer] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [openingCash, setOpeningCash] = useState("");
  const [denomCounts, setDenomCounts] = useState<Record<string, string>>({});
  const [useDenomCounter, setUseDenomCounter] = useState(true);
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, string>>({});
  const [checklistState, setChecklistState] = useState<boolean[]>(morningChecklist.map(() => false));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todaysEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(e => {
      if (!e.event_date) return false;
      const start = e.event_date;
      const end = e.event_end_date || e.event_date;
      return todayStr >= start && todayStr <= end;
    });
  }, [events, todayStr]);

  const activeTrailers = useMemo(() => {
    return trailers?.filter(t => t.status === "active") || [];
  }, [trailers]);

  // Filter inventory by selected trailer
  const relevantInventory = useMemo(() => {
    if (!inventoryItems) return [];
    if (selectedTrailer) {
      return inventoryItems.filter(i => !i.trailer_id || i.trailer_id === selectedTrailer);
    }
    return inventoryItems;
  }, [inventoryItems, selectedTrailer]);

  const lowStockItems = useMemo(() => {
    return relevantInventory.filter(i => {
      const stock = Number(i.current_stock);
      const reorder = Number(i.reorder_point || 0);
      return stock <= reorder && reorder > 0;
    });
  }, [relevantInventory]);

  const completedChecklist = checklistState.filter(Boolean).length;

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Log inventory counts if any were entered
      for (const [itemId, countStr] of Object.entries(inventoryCounts)) {
        if (countStr === "") continue;
        const item = relevantInventory.find(i => i.id === itemId);
        if (!item) continue;
        const counted = Number(countStr);
        const current = Number(item.current_stock);
        if (Math.abs(counted - current) > 0.01) {
          await supabase.from("inventory_items").update({ current_stock: counted }).eq("id", itemId);
          await supabase.from("inventory_logs").insert({
            inventory_item_id: itemId,
            change_amount: counted - current,
            reason: "count",
            notes: `SOD count: system had ${current}, counted ${counted}`,
          });
        }
      }

      onComplete({
        trailerId: selectedTrailer || null,
        eventId: selectedEvent || null,
        openingCash: Number(openingCash) || 0,
        notes,
      });
      toast.success("You're all set — let's make some money! 🚀");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] rounded-3xl bg-card border-2 border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border bg-primary/5 shrink-0">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black text-card-foreground">Start of Day</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            {["Event", "Cash", "Inventory", "Checklist"].map((label, idx) => {
              const steps: SODStep[] = ["event", "cash", "inventory", "checklist"];
              const stepIdx = steps.indexOf(step);
              const isComplete = idx < stepIdx;
              const isCurrent = idx === stepIdx;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  {idx > 0 && <div className={`w-4 h-0.5 ${isComplete ? "bg-primary" : "bg-border"}`} />}
                  <span className={`rounded-full px-2 py-0.5 ${isCurrent ? "bg-primary text-primary-foreground" : isComplete ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* ── EVENT & TRAILER SELECTION ── */}
          {step === "event" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-black text-card-foreground">What's on today?</h3>
                <p className="text-sm text-muted-foreground mt-1">Select your trailer and today's event</p>
              </div>

              {/* Trailer selection */}
              <div>
                <label className="text-sm font-bold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Truck className="h-4 w-4" /> Trailer
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeTrailers.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTrailer(t.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98] touch-manipulation ${
                        selectedTrailer === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Truck className={`h-5 w-5 shrink-0 ${selectedTrailer === t.id ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-bold text-card-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.type || "Food trailer"}</p>
                      </div>
                    </button>
                  ))}
                  {activeTrailers.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 py-4 text-center">No active trailers. Add one in the Trailers page.</p>
                  )}
                </div>
              </div>

              {/* Event selection */}
              <div>
                <label className="text-sm font-bold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Calendar className="h-4 w-4" /> Today's Event
                </label>
                {todaysEvents.length > 0 ? (
                  <div className="space-y-2">
                    {todaysEvents.map(e => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedEvent(e.id)}
                        className={`flex items-center gap-3 w-full rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98] touch-manipulation ${
                          selectedEvent === e.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Calendar className={`h-5 w-5 shrink-0 ${selectedEvent === e.id ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-card-foreground">{e.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                            {e.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.start_time}{e.end_time ? ` – ${e.end_time}` : ""}</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border p-4 text-center">
                    <p className="text-sm text-muted-foreground">No events scheduled today</p>
                    <p className="text-xs text-muted-foreground mt-1">You can still open — just skip this step</p>
                  </div>
                )}
              </div>

              <Button className="w-full h-12 font-black rounded-xl gap-2" onClick={() => setStep("cash")}>
                Next: Opening Cash <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── OPENING CASH ── */}
          {step === "cash" && (
            <div className="space-y-6">
              <div className="text-center">
                <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="text-xl font-black text-card-foreground">Opening Cash Count</h3>
                <p className="text-sm text-muted-foreground mt-1">Count the cash in your drawer before you start</p>
              </div>

              <div>
                <Input
                  type="number"
                  step="0.01"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="e.g. 200.00"
                  className="h-16 rounded-xl border-2 text-2xl font-black text-center"
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  This will be used to reconcile at End of Day
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setStep("event")}>Back</Button>
                <Button className="flex-1 h-12 font-black rounded-xl gap-2" onClick={() => setStep("inventory")}>
                  Next: Quick Inventory <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── QUICK INVENTORY ── */}
          {step === "inventory" && (
            <div className="space-y-6">
              <div className="text-center">
                <Package className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="text-xl font-black text-card-foreground">Quick Inventory Check</h3>
                <p className="text-sm text-muted-foreground mt-1">Verify key items — skip any you don't need</p>
              </div>

              {/* Low stock alerts */}
              {lowStockItems.length > 0 && (
                <div className="rounded-xl border-2 border-warning/30 bg-warning/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-bold text-warning">Low Stock Alerts</p>
                  </div>
                  {lowStockItems.map(item => (
                    <p key={item.id} className="text-xs text-muted-foreground">
                      <strong className="text-warning">{item.name}</strong> — {Number(item.current_stock).toFixed(1)} {item.unit} (reorder at {Number(item.reorder_point).toFixed(1)})
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {relevantInventory.map(item => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-card-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        System: {Number(item.current_stock).toFixed(1)} {item.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Count"
                      value={inventoryCounts[item.id] || ""}
                      onChange={(e) => setInventoryCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 h-9 text-sm text-center"
                    />
                  </div>
                ))}
                {relevantInventory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No inventory items found.</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setStep("cash")}>Back</Button>
                <Button className="flex-1 h-12 font-black rounded-xl gap-2" onClick={() => setStep("checklist")}>
                  Next: Checklist <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── MORNING CHECKLIST ── */}
          {step === "checklist" && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="text-xl font-black text-card-foreground">Opening Checklist</h3>
                <p className="text-sm text-muted-foreground mt-1">{completedChecklist}/{morningChecklist.length} complete</p>
              </div>

              <div className="space-y-2">
                {morningChecklist.map((task, idx) => (
                  <button
                    key={idx}
                    onClick={() => setChecklistState(prev => prev.map((v, i) => i === idx ? !v : v))}
                    className={`flex items-center gap-3 w-full rounded-xl border-2 p-3 text-left transition-all active:scale-[0.98] touch-manipulation ${
                      checklistState[idx]
                        ? "border-success/30 bg-success/5"
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      checklistState[idx] ? "border-success bg-success text-success-foreground" : "border-border"
                    }`}>
                      {checklistState[idx] && <CheckCircle className="h-4 w-4" />}
                    </div>
                    <span className={`text-sm font-medium ${checklistState[idx] ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                      {task}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Weather conditions, special prep, equipment notes..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setStep("inventory")}>Back</Button>
                <Button
                  className="flex-1 h-14 font-black rounded-xl gap-2 text-lg"
                  onClick={handleFinish}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sun className="h-5 w-5" />}
                  {saving ? "Setting up..." : "Open for Business!"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
