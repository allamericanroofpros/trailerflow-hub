import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAllMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/useMenuItems";
import { toast } from "sonner";
import {
  UtensilsCrossed, Plus, Pencil, Trash2, Loader2, DollarSign, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { claudeNonStreaming } from "@/hooks/useClaudeAI";

const categories = [
  { value: "appetizer", label: "Appetizer" },
  { value: "entree", label: "Entrée" },
  { value: "side", label: "Side" },
  { value: "dessert", label: "Dessert" },
  { value: "drink", label: "Drink" },
  { value: "combo", label: "Combo" },
  { value: "other", label: "Other" },
];

const categoryColors: Record<string, string> = {
  appetizer: "bg-accent/10 text-accent",
  entree: "bg-primary/10 text-primary",
  side: "bg-success/10 text-success",
  dessert: "bg-warning/10 text-warning",
  drink: "bg-info/10 text-info",
  combo: "bg-secondary text-secondary-foreground",
  other: "bg-muted text-muted-foreground",
};

type FormState = {
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  is_active: boolean;
};

const emptyForm: FormState = { name: "", description: "", category: "entree", price: 0, cost: 0, is_active: true };

export default function MenuPage() {
  const { data: menuItems, isLoading } = useAllMenuItems();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.price <= 0) return toast.error("Price must be greater than 0");
    try {
      if (editId) {
        await updateItem.mutateAsync({ id: editId, ...form } as any);
        toast.success("Item updated");
      } else {
        await createItem.mutateAsync(form as any);
        toast.success("Item created");
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category,
      price: Number(item.price),
      cost: Number(item.cost),
      is_active: item.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success("Item deleted");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAIOptimize = async () => {
    if (!menuItems?.length) return toast.error("Add menu items first");
    setAiLoading(true);
    try {
      const context = `Here are my menu items: ${JSON.stringify(menuItems.map((i) => ({
        name: i.name, category: i.category, price: Number(i.price), cost: Number(i.cost),
        margin: Number(i.price) > 0 ? ((Number(i.price) - Number(i.cost)) / Number(i.price) * 100).toFixed(1) + "%" : "N/A",
      })))}

Analyze my menu and provide:
1. Which items have the best/worst margins
2. Pricing suggestions to improve profitability
3. Menu mix recommendations (what to promote, what to reconsider)
4. Any combo or upsell suggestions

Keep it concise and actionable.`;
      const result = await claudeNonStreaming("chat", [{ role: "user", content: context }]);
      setAiInsights(result);
    } catch (e: any) {
      toast.error(e.message || "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  const totalItems = menuItems?.length || 0;
  const avgPrice = menuItems?.length
    ? (menuItems.reduce((s, i) => s + Number(i.price), 0) / menuItems.length).toFixed(2)
    : "0.00";
  const avgMargin = menuItems?.length
    ? (menuItems.reduce((s, i) => {
        const p = Number(i.price), c = Number(i.cost);
        return s + (p > 0 ? (p - c) / p * 100 : 0);
      }, 0) / menuItems.length).toFixed(1)
    : "0.0";

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage items, pricing, and get AI optimization.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handleAIOptimize} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI Optimize
            </Button>
            <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Menu Item</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                      <Label>Active</Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                    <div><Label>Cost ($)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></div>
                  </div>
                  <Button className="w-full" onClick={handleSave} disabled={createItem.isPending || updateItem.isPending}>
                    {(createItem.isPending || updateItem.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                    {editId ? "Update" : "Add"} Item
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold text-card-foreground">{totalItems}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Avg Price</p>
            <p className="text-2xl font-bold text-card-foreground">${avgPrice}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Avg Margin</p>
            <p className="text-2xl font-bold text-card-foreground">{avgMargin}%</p>
          </div>
        </div>

        {/* AI Insights */}
        {aiInsights && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">AI Menu Analysis</h3>
              <button onClick={() => setAiInsights(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
            </div>
            <div className="text-sm text-card-foreground whitespace-pre-wrap">{aiInsights}</div>
          </div>
        )}

        {/* Menu Items Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
        ) : !menuItems?.length ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No menu items yet</p>
            <p className="text-xs mt-1">Add your first item to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {menuItems.map((item) => {
              const margin = Number(item.price) > 0 ? ((Number(item.price) - Number(item.cost)) / Number(item.price) * 100).toFixed(1) : "0.0";
              return (
                <div key={item.id} className={`rounded-xl border bg-card p-4 shadow-card space-y-3 ${!item.is_active ? "opacity-50" : "border-border"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
                    </div>
                    <Badge className={`text-[10px] ${categoryColors[item.category] || "bg-muted text-muted-foreground"}`}>
                      {item.category}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-primary">${Number(item.price).toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">Cost: ${Number(item.cost).toFixed(2)} · Margin: {margin}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button variant="ghost" size="sm" className="text-xs h-7 flex-1" onClick={() => handleEdit(item)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
