import { useState, useMemo, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "@/hooks/useOrders";
import { useInventoryItems } from "@/hooks/useInventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Moon, DollarSign, Package, ClipboardCheck, Loader2, CheckCircle,
  AlertTriangle, ChevronRight, Banknote, CreditCard, Smartphone, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EODStep = "overview" | "cash" | "inventory" | "checklist" | "complete";

const nightlyChecklist = [
  "Clean all cooking surfaces and grills",
  "Empty and sanitize grease traps",
  "Restock napkins, cups, utensils",
  "Wipe down counters and POS screen",
  "Sweep and mop trailer floor",
  "Secure all windows and serving hatches",
  "Turn off propane and gas lines",
  "Check refrigerator/freezer temps",
  "Take out trash and recycling",
  "Lock trailer doors",
];

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

const POSEndOfDay = forwardRef<HTMLDivElement, { onClose: () => void; openingCash?: number; trailerId?: string | null }>(
  function POSEndOfDay({ onClose, openingCash = 0, trailerId }, ref) {
    const { data: orders } = useOrders();
    const { data: inventoryItems } = useInventoryItems(trailerId || undefined);
    const navigate = useNavigate();

    const [step, setStep] = useState<EODStep>("overview");
    const [denomCounts, setDenomCounts] = useState<Record<string, string>>({});
    const [eodNotes, setEodNotes] = useState("");
    const [checklistState, setChecklistState] = useState<boolean[]>(nightlyChecklist.map(() => false));
    const [inventoryCounts, setInventoryCounts] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // Calculate drawer total from denominations
    const drawerTotal = useMemo(() => {
      let total = 0;
      [...billDenominations, ...coinDenominations].forEach(d => {
        const count = Number(denomCounts[d.label] || 0);
        total += count * d.value;
      });
      return total;
    }, [denomCounts]);

    const todayStats = useMemo(() => {
      if (!orders) return null;
      const today = new Date().toDateString();
      const todayOrders = orders.filter(
        (o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelled"
      );
      const totalRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
      const totalTips = todayOrders.reduce((s, o) => s + Number(o.tip || 0), 0);
      const totalTax = todayOrders.reduce((s, o) => s + Number(o.tax), 0);

      const byPayment: Record<string, number> = {};
      todayOrders.forEach((o) => {
        const m = o.payment_method || "other";
        byPayment[m] = (byPayment[m] || 0) + Number(o.total);
      });

      return {
        orderCount: todayOrders.length,
        totalRevenue,
        totalTips,
        totalTax,
        cashSales: byPayment["cash"] || 0,
        cardSales: byPayment["card"] || 0,
        digitalSales: byPayment["digital"] || 0,
      };
    }, [orders]);

    const cashVariance = useMemo(() => {
      if (!todayStats) return null;
      const expected = openingCash + todayStats.cashSales;
      const actual = drawerTotal;
      return { expected, actual, variance: actual - expected };
    }, [openingCash, drawerTotal, todayStats]);

    const inventoryVariances = useMemo(() => {
      if (!inventoryItems) return [];
      return inventoryItems
        .filter(item => inventoryCounts[item.id] !== undefined && inventoryCounts[item.id] !== "")
        .map(item => {
          const counted = Number(inventoryCounts[item.id]);
          const expected = Number(item.current_stock);
          return { id: item.id, name: item.name, unit: item.unit, expected, counted, variance: counted - expected };
        });
    }, [inventoryItems, inventoryCounts]);

    const handleCompleteEOD = async () => {
      setSaving(true);
      try {
        for (const v of inventoryVariances) {
          if (v.variance !== 0) {
            await supabase.from("inventory_items").update({ current_stock: v.counted }).eq("id", v.id);
            await supabase.from("inventory_logs").insert({
              inventory_item_id: v.id,
              change_amount: v.variance,
              reason: "count",
              notes: `EOD count adjustment: expected ${v.expected}, counted ${v.counted}`,
            });
          }
        }
        toast.success("End of day completed! See you tomorrow 🌙");
        setStep("complete");
      } catch (e: any) {
        toast.error(e.message || "Failed to save");
      } finally {
        setSaving(false);
      }
    };

    const completedChecklist = checklistState.filter(Boolean).length;

    const updateDenom = (label: string, value: string) => {
      setDenomCounts(prev => ({ ...prev, [label]: value }));
    };

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
        <div className="w-full max-w-2xl mx-4 max-h-[90vh] rounded-3xl bg-card border-2 border-border shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border bg-secondary/30 shrink-0">
            <div className="flex items-center gap-3">
              {step !== "overview" && step !== "complete" && (
                <button
                  onClick={() => setStep(step === "cash" ? "overview" : step === "inventory" ? "cash" : step === "checklist" ? "inventory" : "overview")}
                  className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <Moon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black text-card-foreground">End of Day</h2>
            </div>
            <button onClick={onClose} className="text-sm font-bold text-muted-foreground hover:text-foreground">Close</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* ── OVERVIEW ── */}
            {step === "overview" && todayStats && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-black text-card-foreground">Today's Summary</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border-2 border-border bg-background p-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Revenue</p>
                    <p className="text-2xl font-black text-card-foreground">${todayStats.totalRevenue.toFixed(1)}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-border bg-background p-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Orders</p>
                    <p className="text-2xl font-black text-card-foreground">{todayStats.orderCount}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-border bg-background p-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Tips</p>
                    <p className="text-2xl font-black text-success">${todayStats.totalTips.toFixed(1)}</p>
                  </div>
                  <div className="rounded-2xl border-2 border-border bg-background p-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Tax Collected</p>
                    <p className="text-2xl font-black text-card-foreground">${todayStats.totalTax.toFixed(1)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-border bg-background p-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Payment Breakdown</p>
                  {[
                    { label: "Cash", value: todayStats.cashSales, icon: Banknote },
                    { label: "Card", value: todayStats.cardSales, icon: CreditCard },
                    { label: "Digital", value: todayStats.digitalSales, icon: Smartphone },
                  ].map(p => (
                    <div key={p.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <p.icon className="h-4 w-4" /> {p.label}
                      </div>
                      <span className="text-sm font-bold text-card-foreground">${p.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full h-12 font-black rounded-xl gap-2" onClick={() => setStep("cash")}>
                  Start Shutdown <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── CASH DENOMINATION COUNT ── */}
            {step === "cash" && todayStats && (
              <div className="space-y-6">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-black text-card-foreground">Cash Drawer Count</h3>
                  <p className="text-sm text-muted-foreground mt-1">Count each denomination in your drawer</p>
                </div>

                {/* Opening cash display */}
                <div className="rounded-xl border-2 border-border bg-secondary/30 p-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Opening Cash (from Start of Day)</span>
                  <span className="text-lg font-black text-card-foreground">${openingCash.toFixed(1)}</span>
                </div>

                {/* Bills */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Bills</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {billDenominations.map(d => (
                      <div key={d.label} className="rounded-xl border-2 border-border bg-background p-2 text-center">
                        <p className="text-xs font-bold text-muted-foreground mb-1">{d.label}</p>
                        <Input
                          type="number"
                          min="0"
                          value={denomCounts[d.label] || ""}
                          onChange={(e) => updateDenom(d.label, e.target.value)}
                          placeholder="0"
                          className="h-10 text-center text-sm font-bold border-border"
                        />
                        {Number(denomCounts[d.label] || 0) > 0 && (
                          <p className="text-[10px] text-primary font-bold mt-0.5">
                            ${(Number(denomCounts[d.label]) * d.value).toFixed(1)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coins */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Coins</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {coinDenominations.map(d => (
                      <div key={d.label} className="rounded-xl border-2 border-border bg-background p-2 text-center">
                        <p className="text-xs font-bold text-muted-foreground mb-1">{d.label}</p>
                        <Input
                          type="number"
                          min="0"
                          value={denomCounts[d.label] || ""}
                          onChange={(e) => updateDenom(d.label, e.target.value)}
                          placeholder="0"
                          className="h-10 text-center text-sm font-bold border-border"
                        />
                        {Number(denomCounts[d.label] || 0) > 0 && (
                          <p className="text-[10px] text-primary font-bold mt-0.5">
                            ${(Number(denomCounts[d.label]) * d.value).toFixed(1)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drawer total */}
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-xs font-bold text-muted-foreground">Drawer Total</p>
                  <p className="text-3xl font-black text-card-foreground">${drawerTotal.toFixed(1)}</p>
                </div>

                {/* Variance */}
                {cashVariance && drawerTotal > 0 && (
                  <div className={`rounded-2xl border-2 p-4 text-center ${
                    Math.abs(cashVariance.variance) < 1 ? "border-success/30 bg-success/5"
                    : Math.abs(cashVariance.variance) < 5 ? "border-warning/30 bg-warning/5"
                    : "border-destructive/30 bg-destructive/5"
                  }`}>
                    <p className="text-xs font-bold text-muted-foreground">Expected: ${cashVariance.expected.toFixed(1)} (${openingCash.toFixed(1)} open + ${todayStats.cashSales.toFixed(1)} cash sales)</p>
                    <p className="text-xs font-bold text-muted-foreground">Counted: ${cashVariance.actual.toFixed(1)}</p>
                    <p className={`text-2xl font-black mt-1 ${
                      Math.abs(cashVariance.variance) < 1 ? "text-success"
                      : Math.abs(cashVariance.variance) < 5 ? "text-warning"
                      : "text-destructive"
                    }`}>
                      {cashVariance.variance >= 0 ? "+" : ""}${cashVariance.variance.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.abs(cashVariance.variance) < 1 ? "✅ Perfect!" : Math.abs(cashVariance.variance) < 5 ? "⚠️ Close enough" : "❌ Significant variance — check for errors"}
                    </p>
                  </div>
                )}

                <Button className="w-full h-12 font-black rounded-xl gap-2" onClick={() => setStep("inventory")}>
                  Next: Inventory Count <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── INVENTORY COUNT ── */}
            {step === "inventory" && (
              <div className="space-y-6">
                <div className="text-center">
                  <Package className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-black text-card-foreground">Inventory Count</h3>
                  <p className="text-sm text-muted-foreground mt-1">Count key items — skip any you don't need</p>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {inventoryItems?.map(item => {
                    const counted = inventoryCounts[item.id];
                    const variance = counted !== undefined && counted !== ""
                      ? Number(counted) - Number(item.current_stock) : null;
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-card-foreground truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">System: {Number(item.current_stock).toFixed(1)} {item.unit}</p>
                        </div>
                        <Input
                          type="number" step="0.1" placeholder="Count"
                          value={inventoryCounts[item.id] || ""}
                          onChange={(e) => setInventoryCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-24 h-9 text-sm text-center"
                        />
                        {variance !== null && (
                          <span className={`text-xs font-bold w-14 text-right ${
                            Math.abs(variance) < 0.1 ? "text-success" : Math.abs(variance) < 2 ? "text-warning" : "text-destructive"
                          }`}>{variance >= 0 ? "+" : ""}{variance.toFixed(1)}</span>
                        )}
                      </div>
                    );
                  })}
                  {(!inventoryItems || inventoryItems.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-8">No inventory items to count.</p>
                  )}
                </div>

                <Button className="w-full h-12 font-black rounded-xl gap-2" onClick={() => setStep("checklist")}>
                  Next: Nightly Checklist <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── NIGHTLY CHECKLIST ── */}
            {step === "checklist" && (
              <div className="space-y-6">
                <div className="text-center">
                  <ClipboardCheck className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-black text-card-foreground">Nightly Checklist</h3>
                  <p className="text-sm text-muted-foreground mt-1">{completedChecklist}/{nightlyChecklist.length} complete</p>
                </div>

                <div className="space-y-2">
                  {nightlyChecklist.map((task, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChecklistState(prev => prev.map((v, i) => i === idx ? !v : v))}
                      className={`flex items-center gap-3 w-full rounded-xl border-2 p-3 text-left transition-all active:scale-[0.98] touch-manipulation ${
                        checklistState[idx] ? "border-success/30 bg-success/5" : "border-border bg-background hover:border-primary/30"
                      }`}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        checklistState[idx] ? "border-success bg-success text-success-foreground" : "border-border"
                      }`}>
                        {checklistState[idx] && <CheckCircle className="h-4 w-4" />}
                      </div>
                      <span className={`text-sm font-medium ${checklistState[idx] ? "text-muted-foreground line-through" : "text-card-foreground"}`}>{task}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground">Notes (optional)</label>
                  <Textarea value={eodNotes} onChange={(e) => setEodNotes(e.target.value)} rows={3} placeholder="Anything to note for tomorrow?" className="mt-1" />
                </div>

                <Button className="w-full h-12 font-black rounded-xl gap-2" onClick={handleCompleteEOD} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Moon className="h-4 w-4" />}
                  {saving ? "Saving..." : "Complete End of Day"}
                </Button>
              </div>
            )}

            {/* ── COMPLETE ── */}
            {step === "complete" && (
              <div className="text-center space-y-6 py-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-2xl font-black text-card-foreground">All Done! 🌙</h3>
                <p className="text-sm text-muted-foreground">
                  Inventory has been updated, cash reconciled, and trailer shutdown complete.
                </p>
                {cashVariance && drawerTotal > 0 && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs font-bold text-muted-foreground">Cash Variance</p>
                    <p className={`text-xl font-black ${Math.abs(cashVariance.variance) < 1 ? "text-success" : Math.abs(cashVariance.variance) < 5 ? "text-warning" : "text-destructive"}`}>
                      {cashVariance.variance >= 0 ? "+" : ""}${cashVariance.variance.toFixed(2)}
                    </p>
                  </div>
                )}
                {inventoryVariances.filter(v => Math.abs(v.variance) >= 1).length > 0 && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="text-xs font-bold text-warning">Inventory Adjustments Made</span>
                    </div>
                    {inventoryVariances.filter(v => Math.abs(v.variance) >= 1).map(v => (
                      <p key={v.id} className="text-xs text-muted-foreground">
                        {v.name}: {v.expected} → {v.counted} ({v.variance > 0 ? "+" : ""}{v.variance.toFixed(1)} {v.unit})
                      </p>
                    ))}
                  </div>
                )}
                <Button className="w-full h-12 font-black rounded-xl" onClick={onClose}>Close</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default POSEndOfDay;
