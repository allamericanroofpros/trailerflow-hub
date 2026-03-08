import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInventoryItems, useLowStockItems, useCreateInventoryItem, useUpdateInventoryItem, useCreateInventoryLog, useInventoryLogs } from "@/hooks/useInventory";
import { toast } from "sonner";
import {
  Package, AlertTriangle, Plus, Trash2, ArrowDown, ArrowUp,
  Loader2, Search, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const units = ["oz", "lb", "g", "kg", "ml", "l", "gal", "each", "dozen", "case"];

export default function Inventory() {
  const { data: items, isLoading } = useInventoryItems();
  const { data: lowStock } = useLowStockItems();
  const { data: logs } = useInventoryLogs();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const createLog = useCreateInventoryLog();

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", unit: "each", current_stock: 0, par_level: 0, reorder_point: 0, cost_per_unit: 0, supplier: "" });
  const [adjustDialog, setAdjustDialog] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("restock");
  const [adjustNotes, setAdjustNotes] = useState("");

  const filtered = items?.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return toast.error("Name is required");
    try {
      await createItem.mutateAsync(newItem as any);
      setShowAdd(false);
      setNewItem({ name: "", unit: "each", current_stock: 0, par_level: 0, reorder_point: 0, cost_per_unit: 0, supplier: "" });
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
      // Update stock
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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">Track ingredients, manage stock, and log waste.</p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Name</Label><Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Unit</Label>
                    <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Current Stock</Label><Input type="number" value={newItem.current_stock} onChange={(e) => setNewItem({ ...newItem, current_stock: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Par Level</Label><Input type="number" value={newItem.par_level} onChange={(e) => setNewItem({ ...newItem, par_level: Number(e.target.value) })} /></div>
                  <div><Label>Reorder Point</Label><Input type="number" value={newItem.reorder_point} onChange={(e) => setNewItem({ ...newItem, reorder_point: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cost/Unit ($)</Label><Input type="number" step="0.01" value={newItem.cost_per_unit} onChange={(e) => setNewItem({ ...newItem, cost_per_unit: Number(e.target.value) })} /></div>
                  <div><Label>Supplier</Label><Input value={newItem.supplier} onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={handleAddItem} disabled={createItem.isPending}>
                  {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Low Stock Alert */}
        {lowStock && lowStock.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Low Stock Alert</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lowStock.map((i) => i.name).join(", ")} — below reorder point
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Stock Levels</TabsTrigger>
            <TabsTrigger value="logs">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 max-w-sm">
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
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Par</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Cost/Unit</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Supplier</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const isLow = item.reorder_point && Number(item.current_stock) <= Number(item.reorder_point);
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
                          <td className="text-right px-4 py-3 text-muted-foreground hidden sm:table-cell">{Number(item.par_level).toFixed(1)}</td>
                          <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">${Number(item.cost_per_unit).toFixed(2)}</td>
                          <td className="text-right px-4 py-3 text-muted-foreground hidden md:table-cell">{item.supplier || "—"}</td>
                          <td className="text-right px-4 py-3">
                            <Button
                              variant="outline" size="sm" className="text-xs h-7"
                              onClick={() => setAdjustDialog({ id: item.id, name: item.name, unit: item.unit })}
                            >
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

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
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Stock — {adjustDialog?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Reason</Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" step="0.1" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="e.g. Delivered from Sysco" />
              </div>
              <Button className="w-full" onClick={handleAdjust} disabled={createLog.isPending}>
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
