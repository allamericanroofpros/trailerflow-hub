import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOrgId } from "@/hooks/useOrgId";
import { useInventoryItems, useLowStockItems, useCreateInventoryItem, useUpdateInventoryItem, useCreateInventoryLog, useInventoryLogs } from "@/hooks/useInventory";
import { useEvents } from "@/hooks/useEvents";
import { useTrailers } from "@/hooks/useTrailers";
import { useMenuItems } from "@/hooks/useMenuItems";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Package, AlertTriangle, Plus, ArrowDown, ArrowUp,
  Loader2, Search, ShoppingCart, CalendarDays, Clock,
  Pencil, Trash2, ArrowUpDown, SortAsc, SortDesc, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const units = ["oz", "lb", "g", "kg", "ml", "l", "gal", "each", "dozen", "case"];

type SortField = "name" | "current_stock" | "cost_per_unit" | "par_level";
type SortDir = "asc" | "desc";

export default function Inventory() {
  const orgId = useOrgId();
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
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyNew = {
    name: "", unit: "each", current_stock: 0, par_level: 0, reorder_point: 0,
    cost_per_unit: 0, supplier: "", shelf_life_days: "", unit_size: "", serving_size: "",
    serving_unit: "", serving_unit_conversion: "",
  };
  const [newItem, setNewItem] = useState(emptyNew);

  const [adjustDialog, setAdjustDialog] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("restock");
  const [adjustNotes, setAdjustNotes] = useState("");

  // Sort & filter
  const filtered = useMemo(() => {
    let list = items?.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())) || [];
    list.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === "name") { aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); }
      else { aVal = Number((a as any)[sortField]) || 0; bVal = Number((b as any)[sortField]) || 0; }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === "asc" ? <SortAsc className="h-3 w-3 text-primary" /> : <SortDesc className="h-3 w-3 text-primary" />;
  };

  // Upcoming events for ordering recommendations
  const upcomingEvents = useMemo(() => {
    if (!allEvents) return [];
    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return allEvents
      .filter((e) => e.event_date && new Date(e.event_date) >= now && new Date(e.event_date) <= twoWeeksOut && ["confirmed", "tentative"].includes(e.stage))
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
  }, [allEvents]);

  const orderingNeeds = useMemo(() => {
    if (!upcomingEvents.length || !items) return [];
    const needs: Record<string, { name: string; unit: string; needed: number; current: number; toOrder: number; costEach: number; shelfLife: number | null; events: string[] }> = {};
    upcomingEvents.forEach((event) => {
      const trailer = trailers?.find((t) => t.id === event.trailer_id);
      if (!trailer) return;
      items.forEach((item) => {
        if (item.trailer_id && item.trailer_id !== trailer.id) return;
        if (!item.par_level || Number(item.par_level) === 0) return;
        const parNeeded = Number(item.par_level);
        if (!needs[item.id]) {
          needs[item.id] = { name: item.name, unit: item.unit, needed: 0, current: Number(item.current_stock), toOrder: 0, costEach: Number(item.cost_per_unit) || 0, shelfLife: (item as any).shelf_life_days || null, events: [] };
        }
        needs[item.id].needed += parNeeded;
        needs[item.id].events.push(event.name);
      });
    });
    return Object.values(needs)
      .map((n) => ({ ...n, toOrder: Math.max(0, n.needed - n.current), totalCost: Math.max(0, n.needed - n.current) * n.costEach }))
      .filter((n) => n.toOrder > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [upcomingEvents, items, trailers, menuItems]);

  const spoilageRisk = useMemo(() => {
    if (!items) return [];
    return items
      .filter((item) => { const sl = (item as any).shelf_life_days; if (!sl) return false; return Number(item.current_stock) > Number(item.par_level) * 1.5 && sl <= 7; })
      .map((item) => ({ ...item, shelfLife: (item as any).shelf_life_days, excess: Number(item.current_stock) - Number(item.par_level) }));
  }, [items]);

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return toast.error("Name is required");
    try {
      const { shelf_life_days, unit_size, serving_size, serving_unit, serving_unit_conversion, ...rest } = newItem;
      const insertData: any = { ...rest, org_id: orgId };
      if (shelf_life_days) insertData.shelf_life_days = Number(shelf_life_days);
      if (unit_size) insertData.unit_size = Number(unit_size);
      if (serving_size) insertData.serving_size = Number(serving_size);
      if (serving_unit) insertData.serving_unit = serving_unit;
      if (serving_unit_conversion) insertData.serving_unit_conversion = Number(serving_unit_conversion);
      await createItem.mutateAsync(insertData);
      setShowAdd(false);
      setNewItem(emptyNew);
      toast.success("Item added");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    try {
      // Build a clean payload with only valid, typed fields — avoids JSON serialization errors
      const cleanPayload: Record<string, any> = {
        id: editItem.id,
        name: editItem.name,
        unit: editItem.unit,
        par_level: Number(editItem.par_level) || 0,
        reorder_point: Number(editItem.reorder_point) || 0,
        cost_per_unit: Number(editItem.cost_per_unit) || 0,
        supplier: editItem.supplier || null,
        shelf_life_days: editItem.shelf_life_days ? Number(editItem.shelf_life_days) : null,
        unit_size: editItem.unit_size ? Number(editItem.unit_size) : null,
        serving_size: editItem.serving_size ? Number(editItem.serving_size) : null,
        serving_unit: editItem.serving_unit || null,
        serving_unit_conversion: editItem.serving_unit_conversion ? Number(editItem.serving_unit_conversion) : null,
      };
      // Ensure no NaN values sneak through
      for (const key of Object.keys(cleanPayload)) {
        if (typeof cleanPayload[key] === "number" && isNaN(cleanPayload[key])) {
          cleanPayload[key] = null;
        }
      }
      await updateItem.mutateAsync(cleanPayload as { id: string; [key: string]: any });
      setEditItem(null);
      toast.success("Item updated");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      // Soft delete by marking inactive
      await updateItem.mutateAsync({ id, is_active: false });
      setDeleteConfirm(null);
      toast.success("Item removed");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAdjust = async () => {
    if (!adjustDialog || !adjustAmount) return;
    const amount = Number(adjustAmount);
    const isNegative = ["usage", "waste", "spoilage"].includes(adjustReason);
    const change = isNegative ? -Math.abs(amount) : Math.abs(amount);
    try {
      await createLog.mutateAsync({ inventory_item_id: adjustDialog.id, change_amount: change, reason: adjustReason, notes: adjustNotes || undefined });
      const currentItem = items?.find((i) => i.id === adjustDialog.id);
      if (currentItem) {
        await updateItem.mutateAsync({ id: adjustDialog.id, current_stock: Number(currentItem.current_stock) + change });
      }
      setAdjustDialog(null);
      setAdjustAmount("");
      setAdjustNotes("");
      toast.success("Stock adjusted");
    } catch (e: any) { toast.error(e.message); }
  };

  const totalOrderCost = orderingNeeds.reduce((s, n) => s + n.totalCost, 0);

  // Common conversion presets
  const conversionPresets: Record<string, Record<string, number>> = {
    gal: { oz: 128, cup: 16, pint: 8, quart: 4, ml: 3785, l: 3.785 },
    lb: { oz: 16, g: 453.6, kg: 0.4536 },
    kg: { g: 1000, lb: 2.205, oz: 35.27 },
    l: { ml: 1000, oz: 33.81, gal: 0.264, cup: 4.227 },
    dozen: { each: 12 },
    case: { each: 24 },
  };

  const FieldTip = ({ tip }: { tip: string }) => (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          <p>{tip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const ItemFormFields = ({ item, setItem, isEdit = false }: { item: any; setItem: (v: any) => void; isEdit?: boolean }) => {
    const presets = conversionPresets[item.unit] || {};
    const unitSize = Number(item.unit_size) || 0;
    const stock = Number(item.current_stock) || 0;
    const totalVolume = unitSize > 0 ? stock * unitSize : stock;

    return (
    <div className="space-y-3 mt-2">
      <div>
        <div className="flex items-center gap-1.5">
          <Label>Name</Label>
          <FieldTip tip="The name of this inventory item (e.g. Ice Cream Mix, Burger Buns, Cooking Oil)." />
        </div>
        <Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} className="h-11" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Stock Unit</Label>
            <FieldTip tip="The unit you count and ORDER in. If you order gallons, pick gal. If you order cases, pick case." />
          </div>
          <Select value={item.unit} onValueChange={(v) => setItem({ ...item, unit: v })}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Unit Size</Label>
            <FieldTip tip="Size of each unit you order. E.g. if you buy 2.5 gal tubs of ice cream, enter 2.5. Leave blank if 1 unit = 1 stock unit." />
          </div>
          <Input
            type="number" step="0.01" min="0"
            placeholder="e.g. 2.5"
            value={item.unit_size || ""}
            onChange={(e) => setItem({ ...item, unit_size: e.target.value })}
            className="h-11"
          />
          {unitSize > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">Each unit = {unitSize} {item.unit}</p>}
        </div>
      </div>

      {!isEdit && (
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Current Stock (# of units ordered)</Label>
            <FieldTip tip="How many units you have on hand. E.g. if you have 2 tubs of 2.5 gal ice cream, enter 2 (total = 5 gal)." />
          </div>
          <Input type="number" value={item.current_stock} onChange={(e) => setItem({ ...item, current_stock: e.target.value })} className="h-11" />
          {unitSize > 0 && stock > 0 && (
            <p className="text-[10px] font-semibold text-primary mt-0.5">
              {stock} × {unitSize} {item.unit} = {totalVolume} {item.unit} total
            </p>
          )}
        </div>
      )}

      {/* Serving unit for recipes — with conversion presets */}
      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-muted-foreground">Recipe / Serving Unit</p>
          <FieldTip tip="If your recipes use a DIFFERENT unit than your stock unit. E.g. you stock in gallons but recipes call for ounces. This lets the system auto-convert deductions." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px]">Serving Unit</Label>
              <FieldTip tip="The unit your recipes/modifiers use to measure portions. E.g. oz for scoops of ice cream." />
            </div>
            <Select value={item.serving_unit || "__same__"} onValueChange={(v) => {
              const newUnit = v === "__same__" ? "" : v;
              const autoConversion = newUnit && presets[newUnit] ? presets[newUnit] : "";
              setItem({ ...item, serving_unit: newUnit, serving_unit_conversion: autoConversion || item.serving_unit_conversion });
            }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Same as stock" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__same__">Same as stock unit</SelectItem>
                {units.map((u) => <SelectItem key={u} value={u}>{u}{presets[u] ? ` (auto: ${presets[u]} per ${item.unit})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px]">Per 1 {item.unit}</Label>
              <FieldTip tip={`How many serving units are in 1 ${item.unit}. E.g. 1 gal = 128 oz. This is auto-filled for common conversions.`} />
            </div>
            <Input
              type="number" step="0.01" min="0"
              placeholder="e.g. 128"
              value={item.serving_unit_conversion || ""}
              onChange={(e) => setItem({ ...item, serving_unit_conversion: e.target.value })}
              className="h-9"
            />
            {item.serving_unit && item.serving_unit_conversion && (
              <p className="text-[10px] text-primary mt-0.5">1 {item.unit} = {item.serving_unit_conversion} {item.serving_unit}</p>
            )}
          </div>
        </div>
        {/* Quick conversion presets */}
        {item.serving_unit && Object.keys(presets).length > 0 && !presets[item.serving_unit] && (
          <p className="text-[10px] text-warning">No auto-conversion for {item.unit} → {item.serving_unit}. Enter manually.</p>
        )}
        {Object.keys(presets).length > 0 && !item.serving_unit && (
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-muted-foreground">Quick set:</span>
            {Object.entries(presets).map(([unit, factor]) => (
              <button
                key={unit}
                type="button"
                onClick={() => setItem({ ...item, serving_unit: unit, serving_unit_conversion: factor })}
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {unit} ({factor}/{item.unit})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Par Level</Label>
            <FieldTip tip="Target amount to have on hand for each event. Used to calculate ordering needs. Counted in # of units ordered." />
          </div>
          <Input type="number" value={item.par_level} onChange={(e) => setItem({ ...item, par_level: e.target.value })} className="h-11" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Reorder Point</Label>
            <FieldTip tip="When stock falls to this level, a low-stock alert appears. Set below par to give yourself time to reorder." />
          </div>
          <Input type="number" value={item.reorder_point} onChange={(e) => setItem({ ...item, reorder_point: e.target.value })} className="h-11" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Cost / Unit ($)</Label>
            <FieldTip tip="How much you pay for ONE unit. E.g. if a 2.5 gal tub costs $18, enter $18. Used to calculate recipe costs and margins." />
          </div>
          <Input type="number" step="0.01" value={item.cost_per_unit} onChange={(e) => setItem({ ...item, cost_per_unit: e.target.value })} className="h-11" />
          {unitSize > 0 && Number(item.cost_per_unit) > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ${(Number(item.cost_per_unit) / unitSize).toFixed(3)} per {item.unit}
              {item.serving_unit && item.serving_unit_conversion
                ? ` · $${(Number(item.cost_per_unit) / (unitSize * Number(item.serving_unit_conversion))).toFixed(4)} per ${item.serving_unit}`
                : ""}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Shelf Life (days)</Label>
            <FieldTip tip="How many days this item stays fresh after receiving. Used to flag spoilage risks when you're overstocked on perishables." />
          </div>
          <Input type="number" min="1" placeholder="e.g. 7" value={item.shelf_life_days || ""} onChange={(e) => setItem({ ...item, shelf_life_days: e.target.value })} className="h-11" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Serving Size</Label>
            <FieldTip tip="Default portion size for one serving in the serving unit. E.g. 4 oz for a scoop of ice cream. Used for reference only." />
          </div>
          <Input type="number" step="0.01" min="0" placeholder="e.g. 4" value={item.serving_size || ""} onChange={(e) => setItem({ ...item, serving_size: e.target.value })} className="h-11" />
          {item.serving_size && item.serving_unit && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.serving_size} {item.serving_unit || item.unit} per serving</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Supplier</Label>
            <FieldTip tip="Where you order this from. Helps when building order lists." />
          </div>
          <Input value={item.supplier || ""} onChange={(e) => setItem({ ...item, supplier: e.target.value })} className="h-11" />
        </div>
      </div>
    </div>
    );
  };

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
              <ItemFormFields item={newItem} setItem={setNewItem} />
              <Button className="w-full h-11 mt-3" onClick={handleAddItem} disabled={createItem.isPending}>
                {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Add Item
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lowStock && lowStock.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Low Stock</p>
                <p className="text-xs text-muted-foreground mt-0.5">{lowStock.map((i) => i.name).join(", ")}</p>
              </div>
            </div>
          )}
          {spoilageRisk.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 sm:p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Spoilage Risk</p>
                <p className="text-xs text-muted-foreground mt-0.5">{spoilageRisk.map((i) => `${i.name} (${i.shelfLife}d, ${i.excess.toFixed(0)} excess)`).join("; ")}</p>
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
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary ml-1">{orderingNeeds.length}</span>
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
                    return (
                      <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                            <p className="font-semibold text-card-foreground text-sm">{item.name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditItem({ ...item })}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteConfirm(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Stock</span>
                            <p className={`font-bold ${isLow ? "text-destructive" : "text-card-foreground"}`}>
                              {Number(item.current_stock).toFixed(1)} units
                            </p>
                            {(item as any).unit_size && Number((item as any).unit_size) > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                = {(Number(item.current_stock) * Number((item as any).unit_size)).toFixed(1)} {item.unit}
                              </p>
                            )}
                          </div>
                          <div><span className="text-muted-foreground">Par</span><p className="font-semibold text-card-foreground">{Number(item.par_level).toFixed(1)}</p></div>
                          <div><span className="text-muted-foreground">Cost</span><p className="font-semibold text-card-foreground">${Number(item.cost_per_unit).toFixed(1)}</p></div>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs h-8 w-full touch-manipulation"
                          onClick={() => setAdjustDialog({ id: item.id, name: item.name, unit: item.unit })}>
                          Adjust Stock
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden hidden sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("name")}>
                          <span className="flex items-center gap-1">Item <SortIcon field="name" /></span>
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("current_stock")}>
                          <span className="flex items-center gap-1 justify-end">Stock <SortIcon field="current_stock" /></span>
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("par_level")}>
                          <span className="flex items-center gap-1 justify-end">Par <SortIcon field="par_level" /></span>
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Shelf Life</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("cost_per_unit")}>
                          <span className="flex items-center gap-1 justify-end">Cost/Unit <SortIcon field="cost_per_unit" /></span>
                        </th>
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
                                  <p className="text-xs text-muted-foreground">
                                    {item.unit}
                                    {(item as any).unit_size ? ` · ${(item as any).unit_size} ${item.unit}/unit` : ""}
                                    {(item as any).serving_unit ? ` · recipes in ${(item as any).serving_unit}` : ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className={`text-right px-4 py-3 font-semibold ${isLow ? "text-destructive" : "text-card-foreground"}`}>
                              {Number(item.current_stock).toFixed(1)}
                              {(item as any).unit_size && Number((item as any).unit_size) > 0 && (
                                <span className="block text-[10px] font-normal text-muted-foreground">
                                  = {(Number(item.current_stock) * Number((item as any).unit_size)).toFixed(1)} {item.unit}
                                </span>
                              )}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{Number(item.par_level).toFixed(1)}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">
                              {shelfLife ? <span className={shelfLife <= 3 ? "text-destructive font-semibold" : shelfLife <= 7 ? "text-warning" : ""}>{shelfLife}d</span> : "—"}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">${Number(item.cost_per_unit).toFixed(1)}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground hidden lg:table-cell">{item.supplier || "—"}</td>
                            <td className="text-right px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditItem({ ...item })}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(item.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" className="text-xs h-7 ml-1"
                                  onClick={() => setAdjustDialog({ id: item.id, name: item.name, unit: item.unit })}>
                                  Adjust
                                </Button>
                              </div>
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

            {orderingNeeds.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-card-foreground">Order List</h3>
                  </div>
                  <span className="text-sm font-bold text-primary">Est. ${totalOrderCost.toFixed(1)}</span>
                </div>
                <table className="w-full text-sm hidden sm:table">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Current</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Needed</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Order Qty</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderingNeeds.map((need, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-2.5 font-medium text-card-foreground">{need.name}<span className="text-xs text-muted-foreground ml-1">({need.unit})</span></td>
                        <td className="text-right px-4 py-2.5 text-muted-foreground">{need.current.toFixed(1)}</td>
                        <td className="text-right px-4 py-2.5 text-muted-foreground">{need.needed.toFixed(1)}</td>
                        <td className="text-right px-4 py-2.5 font-bold text-primary">{need.toOrder.toFixed(1)}</td>
                        <td className="text-right px-4 py-2.5 font-semibold text-card-foreground">${need.totalCost.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/50">
                      <td colSpan={4} className="px-4 py-2.5 font-bold text-card-foreground text-right">Total</td>
                      <td className="text-right px-4 py-2.5 font-black text-primary text-base">${totalOrderCost.toFixed(1)}</td>
                    </tr>
                  </tfoot>
                </table>
                {/* Mobile */}
                <div className="space-y-0 sm:hidden">
                  {orderingNeeds.map((need, i) => (
                    <div key={i} className="p-4 border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-card-foreground">{need.name}</p>
                        <p className="text-sm font-bold text-primary">{need.toOrder.toFixed(1)} {need.unit}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Have {need.current.toFixed(1)} · Need {need.needed.toFixed(1)} · ${need.totalCost.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingEvents.length > 0 && orderingNeeds.length === 0 && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                <Package className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-success">Stock looks good!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Current inventory meets par levels for upcoming events.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ══ LOGS TAB ══ */}
          <TabsContent value="logs" className="mt-4">
            {!logs?.length ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground"><p className="text-sm">No activity yet</p></div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    {Number(log.change_amount) > 0 ? <ArrowUp className="h-4 w-4 text-success shrink-0" /> : <ArrowDown className="h-4 w-4 text-destructive shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">
                        {(log as any).inventory_items?.name || "Item"}{" "}
                        <span className={Number(log.change_amount) > 0 ? "text-success" : "text-destructive"}>
                          {Number(log.change_amount) > 0 ? "+" : ""}{Number(log.change_amount).toFixed(1)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{log.reason}{log.notes ? ` — ${log.notes}` : ""}</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleDateString()}</p>
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
              <div><Label>Amount ({adjustDialog?.unit})</Label><Input type="number" step="0.1" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="h-11" /></div>
              <div><Label>Notes (optional)</Label><Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="e.g. Delivered from Sysco" className="h-11" /></div>
              <Button className="w-full h-11" onClick={handleAdjust} disabled={createLog.isPending}>
                {createLog.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {["usage", "waste", "spoilage"].includes(adjustReason) ? "Remove Stock" : "Add Stock"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit — {editItem?.name}</DialogTitle></DialogHeader>
            {editItem && <ItemFormFields item={editItem} setItem={setEditItem} isEdit />}
            <Button className="w-full h-11 mt-3" onClick={handleEditSave} disabled={updateItem.isPending}>
              {updateItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Save Changes
            </Button>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Remove Item?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This will deactivate the item. It won't appear in stock lists but existing records are preserved.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Remove</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
