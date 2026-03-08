import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInventoryItems, useLowStockItems, useCreateInventoryItem, useUpdateInventoryItem, useCreateInventoryLog, useInventoryLogs } from "@/hooks/useInventory";
import { useEvents } from "@/hooks/useEvents";
import { useTrailers } from "@/hooks/useTrailers";
import { useMenuItems } from "@/hooks/useMenuItems";
import { toast } from "sonner";
import {
  Package, AlertTriangle, Plus, ArrowDown, ArrowUp,
  Loader2, Search, ShoppingCart, CalendarDays, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const units = ["oz", "lb", "g", "kg", "ml", "l", "gal", "each", "dozen", "case"];

export default function Inventory() {
  const { data: items, isLoading } = useInventoryItems();
  const { data: lowStock } = useLowStockItems();
  const { data: logs } = useInventoryLogs();
  const { data: allEvents } = useEvents();
  const { data: trailers } = useTrailers();
  const { data: menuItems } = useMenuItems();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const createLog = useCreateInventoryLog();

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "", unit: "each", current_stock: 0, par_level: 0, reorder_point: 0,
    cost_per_unit: 0, supplier: "", shelf_life_days: "", unit_size: "", serving_size: "",
  });
  const [adjustDialog, setAdjustDialog] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("restock");
  const [adjustNotes, setAdjustNotes] = useState("");

  const filtered = items?.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  // Upcoming events for ordering recommendations
  const upcomingEvents = useMemo(() => {
    if (!allEvents) return [];
    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return allEvents
      .filter((e) => e.event_date && new Date(e.event_date) >= now && new Date(e.event_date) <= twoWeeksOut && ["confirmed", "tentative"].includes(e.stage))
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
  }, [allEvents]);

  // Calculate ordering needs based on upcoming events
  const orderingNeeds = useMemo(() => {
    if (!upcomingEvents.length || !items) return [];

    const needs: Record<string, { name: string; unit: string; needed: number; current: number; toOrder: number; costEach: number; shelfLife: number | null; events: string[] }> = {};

    upcomingEvents.forEach((event) => {
      const trailer = trailers?.find((t) => t.id === event.trailer_id);
      if (!trailer) return;

      const startTime = event.start_time ? parseInt(event.start_time.split(":")[0]) : 10;
      const endTime = event.end_time ? parseInt(event.end_time.split(":")[0]) : 16;
      const eventHours = Math.max(endTime - startTime, 1);
      const estCustomers = (trailer.avg_customers_per_hour || 25) * eventHours;

      // For each menu item on this trailer, calculate ingredient needs
      const trailerMenuItems = menuItems?.filter((mi) => mi.trailer_id === trailer.id && mi.is_active) || [];
      const avgItemsPerCustomer = 1.2; // assume each customer orders ~1.2 items
      const ordersPerItem = (estCustomers * avgItemsPerCustomer) / Math.max(trailerMenuItems.length, 1);

      // We don't have ingredient-level data in JS, but we can estimate based on par levels
      items.forEach((item) => {
        if (item.trailer_id && item.trailer_id !== trailer.id) return;
        if (!item.par_level || Number(item.par_level) === 0) return;

        const parNeeded = Number(item.par_level);
        if (!needs[item.id]) {
          needs[item.id] = {
            name: item.name,
            unit: item.unit,
            needed: 0,
            current: Number(item.current_stock),
            toOrder: 0,
            costEach: Number(item.cost_per_unit) || 0,
            shelfLife: (item as any).shelf_life_days || null,
            events: [],
          };
        }
        needs[item.id].needed += parNeeded;
        needs[item.id].events.push(event.name);
      });
    });

    // Calculate what needs ordering
    return Object.values(needs)
      .map((n) => ({
        ...n,
        toOrder: Math.max(0, n.needed - n.current),
        totalCost: Math.max(0, n.needed - n.current) * n.costEach,
      }))
      .filter((n) => n.toOrder > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [upcomingEvents, items, trailers, menuItems]);

  // Spoilage risk items
  const spoilageRisk = useMemo(() => {
    if (!items) return [];
    return items
      .filter((item) => {
        const shelfLife = (item as any).shelf_life_days;
        if (!shelfLife) return false;
        const stock = Number(item.current_stock);
        const par = Number(item.par_level) || 0;
        // Flag if we have significantly more than par and shelf life is short
        return stock > par * 1.5 && shelfLife <= 7;
      })
      .map((item) => ({
        ...item,
        shelfLife: (item as any).shelf_life_days,
        excess: Number(item.current_stock) - Number(item.par_level),
      }));
  }, [items]);

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return toast.error("Name is required");
    try {
      const { shelf_life_days, unit_size, serving_size, ...rest } = newItem;
      const insertData: any = { ...rest };
      if (shelf_life_days) insertData.shelf_life_days = Number(shelf_life_days);
      if (unit_size) insertData.unit_size = Number(unit_size);
      if (serving_size) insertData.serving_size = Number(serving_size);
      await createItem.mutateAsync(insertData);
      setShowAdd(false);
      setNewItem({ name: "", unit: "each", current_stock: 0, par_level: 0, reorder_point: 0, cost_per_unit: 0, supplier: "", shelf_life_days: "", unit_size: "", serving_size: "" });
      toast.success("Item added");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAdjust = async () => {
    if (!adjustDialog || !adjustAmount) return;
    const amount = Number(adjustAmount);
    const isNegative = ["usage", "waste", "spoilage"].includes(adjustReason);
    const change = isNegative ? -Math.abs(amount) : Math.abs(amount);

    try {
      await createLog.mutateAsync({
        inventory_item_id: adjustDialog.id,
        change_amount: change,
        reason: adjustReason,
        notes: adjustNotes || undefined,
      });
      const currentItem = items?.find((i) => i.id === adjustDialog.id);
      if (currentItem) {
        await updateItem.mutateAsync({
          id: adjustDialog.id,
          current_stock: Number(currentItem.current_stock) + change,
        });
      }
      setAdjustDialog(null);
      setAdjustAmount("");
      setAdjustNotes("");
      toast.success("Stock adjusted");
    } catch (e: any) { toast.error(e.message); }
  };

  const totalOrderCost = orderingNeeds.reduce((s, n) => s + n.totalCost, 0);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Track stock, plan orders, and manage shelf life.</p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 w-full sm:w-auto"><Plus className="h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Name</Label><Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="h-11" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Unit</Label>
                    <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Current Stock</Label><Input type="number" value={newItem.current_stock} onChange={(e) => setNewItem({ ...newItem, current_stock: Number(e.target.value) })} className="h-11" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Par Level</Label><Input type="number" value={newItem.par_level} onChange={(e) => setNewItem({ ...newItem, par_level: Number(e.target.value) })} className="h-11" /></div>
                  <div><Label>Reorder Point</Label><Input type="number" value={newItem.reorder_point} onChange={(e) => setNewItem({ ...newItem, reorder_point: Number(e.target.value) })} className="h-11" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cost/Unit ($)</Label><Input type="number" step="0.01" value={newItem.cost_per_unit} onChange={(e) => setNewItem({ ...newItem, cost_per_unit: Number(e.target.value) })} className="h-11" /></div>
                  <div>
                    <Label>Shelf Life (days)</Label>
                    <Input type="number" min="1" placeholder="e.g. 7" value={newItem.shelf_life_days} onChange={(e) => setNewItem({ ...newItem, shelf_life_days: e.target.value })} className="h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Unit Size (purchase qty)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="e.g. 50" value={newItem.unit_size} onChange={(e) => setNewItem({ ...newItem, unit_size: e.target.value })} className="h-11" />
                  </div>
                  <div>
                    <Label>Serving Size</Label>
                    <Input type="number" step="0.01" min="0" placeholder="e.g. 1.5" value={newItem.serving_size} onChange={(e) => setNewItem({ ...newItem, serving_size: e.target.value })} className="h-11" />
                  </div>
                </div>
                <div><Label>Supplier</Label><Input value={newItem.supplier} onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })} className="h-11" /></div>
                <Button className="w-full h-11" onClick={handleAddItem} disabled={createItem.isPending}>
                  {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Low Stock + Spoilage Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lowStock && lowStock.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Low Stock</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lowStock.map((i) => i.name).join(", ")}
                </p>
              </div>
            </div>
          )}
          {spoilageRisk.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 sm:p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Spoilage Risk</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {spoilageRisk.map((i) => `${i.name} (${i.shelfLife}d shelf life, ${i.excess.toFixed(0)} excess)`).join("; ")}
                </p>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="stock">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="stock" className="text-xs sm:text-sm">Stock</TabsTrigger>
            <TabsTrigger value="ordering" className="text-xs sm:text-sm gap-1">
              <ShoppingCart className="h-3.5 w-3.5 hidden sm:inline" /> Ordering
              {orderingNeeds.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary ml-1">
                  {orderingNeeds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm">Log</TabsTrigger>
          </TabsList>

          {/* ══ STOCK TAB ══ */}
          <TabsContent value="stock" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
            ) : !filtered?.length ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Package className="h-10 w-10 mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium">No inventory items</p>
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="space-y-2 sm:hidden">
                  {filtered.map((item) => {
                    const isLow = item.reorder_point && Number(item.current_stock) <= Number(item.reorder_point);
                    const shelfLife = (item as any).shelf_life_days;
                    return (
                      <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                            <p className="font-semibold text-card-foreground text-sm">{item.name}</p>
                          </div>
                          <Button variant="outline" size="sm" className="text-xs h-8 touch-manipulation"
                            onClick={() => setAdjustDialog({ id: item.id, name: item.name, unit: item.unit })}>
                            Adjust
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Stock</span>
                            <p className={`font-bold ${isLow ? "text-destructive" : "text-card-foreground"}`}>{Number(item.current_stock).toFixed(1)} {item.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Par</span>
                            <p className="font-semibold text-card-foreground">{Number(item.par_level).toFixed(1)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{shelfLife ? "Shelf Life" : "Cost"}</span>
                            <p className="font-semibold text-card-foreground">{shelfLife ? `${shelfLife}d` : `$${Number(item.cost_per_unit).toFixed(2)}`}</p>
                          </div>
                        </div>
                        {((item as any).unit_size || (item as any).serving_size) && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Unit Size</span>
                              <p className="font-semibold text-card-foreground">{(item as any).unit_size ? `${Number((item as any).unit_size)} ${item.unit}` : "—"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Serving</span>
                              <p className="font-semibold text-card-foreground">{(item as any).serving_size ? `${Number((item as any).serving_size)} ${item.unit}` : "—"}</p>
                            </div>
                          </div>
                        )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden hidden sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Par</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Shelf Life</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Unit Size</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Serving</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Cost/Unit</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Supplier</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const isLow = item.reorder_point && Number(item.current_stock) <= Number(item.reorder_point);
                        const shelfLife = (item as any).shelf_life_days;
                        return (
                          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                                <div>
                                  <p className="font-medium text-card-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                                </div>
                              </div>
                            </td>
                            <td className={`text-right px-4 py-3 font-semibold ${isLow ? "text-destructive" : "text-card-foreground"}`}>
                              {Number(item.current_stock).toFixed(1)}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{Number(item.par_level).toFixed(1)}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">
                              {shelfLife ? (
                                <span className={shelfLife <= 3 ? "text-destructive font-semibold" : shelfLife <= 7 ? "text-warning" : ""}>
                                  {shelfLife}d
                                </span>
                              ) : "—"}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">
                              {(item as any).unit_size ? `${Number((item as any).unit_size)} ${item.unit}` : "—"}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">
                              {(item as any).serving_size ? `${Number((item as any).serving_size)} ${item.unit}` : "—"}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">${Number(item.cost_per_unit).toFixed(2)}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden lg:table-cell">{item.supplier || "—"}</td>
                            <td className="text-right px-4 py-3">
                              <Button variant="outline" size="sm" className="text-xs h-7"
                                onClick={() => setAdjustDialog({ id: item.id, name: item.name, unit: item.unit })}>
                                Adjust
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>

          {/* ══ ORDERING TAB ══ */}
          <TabsContent value="ordering" className="mt-4 space-y-4">
            {/* Upcoming events summary */}
            {upcomingEvents.length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-card-foreground">Upcoming Events (Next 14 Days)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {upcomingEvents.map((e) => {
                    const trailer = trailers?.find((t) => t.id === e.trailer_id);
                    return (
                      <div key={e.id} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-sm font-semibold text-card-foreground truncate">{e.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.event_date ? new Date(e.event_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                          {trailer ? ` · ${trailer.name}` : ""}
                        </p>
                        {e.attendance_estimate && (
                          <p className="text-xs text-muted-foreground">~{e.attendance_estimate.toLocaleString()} attendees</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-card-foreground">No confirmed events in next 14 days</p>
                <p className="text-xs text-muted-foreground mt-1">Ordering suggestions appear when you have upcoming events with assigned trailers.</p>
              </div>
            )}

            {/* Order list */}
            {orderingNeeds.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-card-foreground">Order List</h3>
                  </div>
                  <span className="text-sm font-bold text-primary">Est. ${totalOrderCost.toFixed(2)}</span>
                </div>

                {/* Mobile card layout */}
                <div className="space-y-0 sm:hidden">
                  {orderingNeeds.map((need, i) => (
                    <div key={i} className="p-4 border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-card-foreground">{need.name}</p>
                        <p className="text-sm font-bold text-primary">{need.toOrder.toFixed(1)} {need.unit}</p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          Have {need.current.toFixed(1)} · Need {need.needed.toFixed(1)}
                        </p>
                        <p className="text-xs font-semibold text-card-foreground">${need.totalCost.toFixed(2)}</p>
                      </div>
                      {need.shelfLife && (
                        <p className="text-[10px] text-warning mt-1">⚠ {need.shelfLife}d shelf life — order close to event</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">For: {need.events.join(", ")}</p>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <table className="w-full text-sm hidden sm:table">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Current</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Needed</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Order Qty</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Shelf Life</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Est. Cost</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderingNeeds.map((need, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-2.5 font-medium text-card-foreground">{need.name}<span className="text-xs text-muted-foreground ml-1">({need.unit})</span></td>
                        <td className="text-right px-4 py-2.5 text-muted-foreground">{need.current.toFixed(1)}</td>
                        <td className="text-right px-4 py-2.5 text-muted-foreground">{need.needed.toFixed(1)}</td>
                        <td className="text-right px-4 py-2.5 font-bold text-primary">{need.toOrder.toFixed(1)}</td>
                        <td className="text-right px-4 py-2.5 hidden md:table-cell">
                          {need.shelfLife ? (
                            <span className={need.shelfLife <= 3 ? "text-destructive font-semibold" : need.shelfLife <= 7 ? "text-warning" : "text-muted-foreground"}>
                              {need.shelfLife}d
                            </span>
                          ) : "—"}
                        </td>
                        <td className="text-right px-4 py-2.5 font-semibold text-card-foreground">${need.totalCost.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{need.events.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/50">
                      <td colSpan={5} className="px-4 py-2.5 font-bold text-card-foreground text-right">Total Order Cost</td>
                      <td className="text-right px-4 py-2.5 font-black text-primary text-base">${totalOrderCost.toFixed(2)}</td>
                      <td className="hidden lg:table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {upcomingEvents.length > 0 && orderingNeeds.length === 0 && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                <Package className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-success">Stock looks good!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Current inventory meets par levels for upcoming events. Set par levels on items to get ordering recommendations.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ══ LOGS TAB ══ */}
          <TabsContent value="logs" className="mt-4">
            {!logs?.length ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    {Number(log.change_amount) > 0 ? (
                      <ArrowUp className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">
                        {(log as any).inventory_items?.name || "Item"}{" "}
                        <span className={Number(log.change_amount) > 0 ? "text-success" : "text-destructive"}>
                          {Number(log.change_amount) > 0 ? "+" : ""}{Number(log.change_amount).toFixed(1)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{log.reason}{log.notes ? ` — ${log.notes}` : ""}</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Adjust Stock Dialog */}
        <Dialog open={!!adjustDialog} onOpenChange={(v) => !v && setAdjustDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Adjust — {adjustDialog?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Reason</Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                    <SelectItem value="waste">Waste</SelectItem>
                    <SelectItem value="spoilage">Spoilage</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount ({adjustDialog?.unit})</Label>
                <Input type="number" step="0.1" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="h-11" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="e.g. Delivered from Sysco" className="h-11" />
              </div>
              <Button className="w-full h-11" onClick={handleAdjust} disabled={createLog.isPending}>
                {createLog.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {["usage", "waste", "spoilage"].includes(adjustReason) ? "Remove Stock" : "Add Stock"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
