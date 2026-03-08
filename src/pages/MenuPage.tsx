import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAllMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/useMenuItems";
import { useInventoryItems } from "@/hooks/useInventory";
import { toast } from "sonner";
import {
  UtensilsCrossed, Plus, Pencil, Trash2, Loader2, DollarSign, Sparkles,
  Package, X, ChevronDown, ChevronUp, Beaker,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { claudeNonStreaming } from "@/hooks/useClaudeAI";
import { supabase } from "@/integrations/supabase/client";

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

type Modifier = {
  name: string; // e.g. "Size"
  options: { label: string; priceAdjust: number; inventoryAdjustments?: { inventoryItemId: string; extraQty: number }[] }[];
  required: boolean;
};

type Ingredient = {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  quantityUsed: number;
};

type FormState = {
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  is_active: boolean;
  ingredients: Ingredient[];
  modifiers: Modifier[];
};

const emptyForm: FormState = {
  name: "", description: "", category: "entree", price: 0, cost: 0, is_active: true,
  ingredients: [], modifiers: [],
};

export default function MenuPage() {
  const { data: menuItems, isLoading } = useAllMenuItems();
  const { data: inventoryItems } = useInventoryItems();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [showIngredients, setShowIngredients] = useState(true);
  const [showModifiers, setShowModifiers] = useState(true);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.price <= 0) return toast.error("Price must be greater than 0");
    try {
      const payload: any = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        price: form.price,
        cost: form.cost,
        is_active: form.is_active,
        modifiers: form.modifiers.length > 0 ? form.modifiers : null,
      };

      let itemId = editId;

      if (editId) {
        await updateItem.mutateAsync({ id: editId, ...payload });
      } else {
        const result = await createItem.mutateAsync(payload);
        itemId = (result as any).id;
      }

      // Save ingredients (recipe)
      if (itemId) {
        // Delete existing ingredients
        await supabase.from("menu_item_ingredients").delete().eq("menu_item_id", itemId);
        // Insert new ones
        if (form.ingredients.length > 0) {
          const ingredientRows = form.ingredients.map(ing => ({
            menu_item_id: itemId!,
            inventory_item_id: ing.inventoryItemId,
            quantity_used: ing.quantityUsed,
          }));
          const { error } = await supabase.from("menu_item_ingredients").insert(ingredientRows);
          if (error) console.error("Failed to save ingredients:", error);
        }
      }

      toast.success(editId ? "Item updated" : "Item created");
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    // Map existing ingredients
    const ingredients: Ingredient[] = (item.menu_item_ingredients || []).map((ing: any) => ({
      inventoryItemId: ing.inventory_item_id,
      inventoryItemName: ing.inventory_items?.name || "Unknown",
      unit: ing.inventory_items?.unit || "each",
      quantityUsed: Number(ing.quantity_used),
    }));
    // Map existing modifiers
    const modifiers: Modifier[] = Array.isArray(item.modifiers) ? item.modifiers : [];
    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category,
      price: Number(item.price),
      cost: Number(item.cost),
      is_active: item.is_active,
      ingredients,
      modifiers,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success("Item deleted");
    } catch (e: any) { toast.error(e.message); }
  };

  // Ingredient helpers
  const addIngredient = () => {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { inventoryItemId: "", inventoryItemName: "", unit: "", quantityUsed: 1 }] }));
  };
  const removeIngredient = (idx: number) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  };
  const updateIngredient = (idx: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => {
        if (i !== idx) return ing;
        if (field === "inventoryItemId") {
          const invItem = inventoryItems?.find(ii => ii.id === value);
          return { ...ing, inventoryItemId: value, inventoryItemName: invItem?.name || "", unit: invItem?.unit || "" };
        }
        return { ...ing, [field]: value };
      }),
    }));
  };

  // Modifier helpers
  const addModifier = () => {
    setForm(f => ({ ...f, modifiers: [...f.modifiers, { name: "", options: [{ label: "", priceAdjust: 0 }], required: false }] }));
  };
  const removeModifier = (idx: number) => {
    setForm(f => ({ ...f, modifiers: f.modifiers.filter((_, i) => i !== idx) }));
  };
  const updateModifier = (idx: number, field: string, value: any) => {
    setForm(f => ({ ...f, modifiers: f.modifiers.map((m, i) => i === idx ? { ...m, [field]: value } : m) }));
  };
  const addModifierOption = (modIdx: number) => {
    setForm(f => ({
      ...f,
      modifiers: f.modifiers.map((m, i) => i === modIdx ? { ...m, options: [...m.options, { label: "", priceAdjust: 0 }] } : m),
    }));
  };
  const removeModifierOption = (modIdx: number, optIdx: number) => {
    setForm(f => ({
      ...f,
      modifiers: f.modifiers.map((m, i) => i === modIdx ? { ...m, options: m.options.filter((_, j) => j !== optIdx) } : m),
    }));
  };
  const updateModifierOption = (modIdx: number, optIdx: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      modifiers: f.modifiers.map((m, i) => i === modIdx ? {
        ...m,
        options: m.options.map((o, j) => j === optIdx ? { ...o, [field]: value } : o),
      } : m),
    }));
  };

  const handleAIOptimize = async () => {
    if (!menuItems?.length) return toast.error("Add menu items first");
    setAiLoading(true);
    try {
      const context = `Here are my menu items: ${JSON.stringify(menuItems.map((i) => ({
        name: i.name, category: i.category, price: Number(i.price), cost: Number(i.cost),
        margin: Number(i.price) > 0 ? ((Number(i.price) - Number(i.cost)) / Number(i.price) * 100).toFixed(1) + "%" : "N/A",
        ingredients: (i as any).menu_item_ingredients?.length || 0,
      })))}
Analyze my menu and provide: 1. Best/worst margins 2. Pricing suggestions 3. Menu mix recommendations 4. Combo/upsell suggestions. Keep it concise.`;
      const result = await claudeNonStreaming("chat", [{ role: "user", content: context }]);
      setAiInsights(result);
    } catch (e: any) { toast.error(e.message || "AI analysis failed"); }
    finally { setAiLoading(false); }
  };

  const totalItems = menuItems?.length || 0;
  const avgPrice = menuItems?.length ? (menuItems.reduce((s, i) => s + Number(i.price), 0) / menuItems.length).toFixed(2) : "0.00";
  const avgMargin = menuItems?.length
    ? (menuItems.reduce((s, i) => { const p = Number(i.price), c = Number(i.cost); return s + (p > 0 ? (p - c) / p * 100 : 0); }, 0) / menuItems.length).toFixed(1)
    : "0.0";

  // Estimated cost from ingredients
  const ingredientCost = useMemo(() => {
    return form.ingredients.reduce((sum, ing) => {
      const invItem = inventoryItems?.find(ii => ii.id === ing.inventoryItemId);
      const costPerUnit = Number(invItem?.cost_per_unit) || 0;
      return sum + costPerUnit * ing.quantityUsed;
    }, 0);
  }, [form.ingredients, inventoryItems]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage items, recipes, modifiers, and get AI optimization.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handleAIOptimize} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI Optimize
            </Button>
            <Button className="gap-1.5" onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
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
              const ingredientCount = (item as any).menu_item_ingredients?.length || 0;
              const modifierCount = Array.isArray(item.modifiers) ? (item.modifiers as any[]).length : 0;
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
                  {/* Recipe & modifier badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {ingredientCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                        <Beaker className="h-2.5 w-2.5" /> {ingredientCount} ingredient{ingredientCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {modifierCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                        <DollarSign className="h-2.5 w-2.5" /> {modifierCount} modifier{modifierCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {ingredientCount === 0 && (
                      <span className="text-[10px] text-warning">No recipe linked</span>
                    )}
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

      {/* ── Full Item Editor (Sheet) ── */}
      <Sheet open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editId ? "Edit" : "Add"} Menu Item</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 mt-4 pb-8">
            {/* Basic Info */}
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1" /></div>
                <div><Label>Cost ($)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} className="mt-1" /></div>
              </div>
            </div>

            {/* ── Recipe / Ingredients ── */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <button onClick={() => setShowIngredients(!showIngredients)} className="flex items-center gap-2 w-full text-left">
                <Beaker className="h-4 w-4 text-success" />
                <span className="text-sm font-bold text-foreground flex-1">Recipe — Inventory Items Used</span>
                {showIngredients ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showIngredients && (
                <>
                  {form.ingredients.length === 0 && (
                    <p className="text-xs text-muted-foreground">No ingredients linked. Add ingredients so inventory auto-deducts when sold.</p>
                  )}
                  {form.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <div className="flex-1">
                        {idx === 0 && <Label className="text-[10px]">Inventory Item</Label>}
                        <select
                          value={ing.inventoryItemId}
                          onChange={(e) => updateIngredient(idx, "inventoryItemId", e.target.value)}
                          className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
                        >
                          <option value="">Select item...</option>
                          {inventoryItems?.map(ii => <option key={ii.id} value={ii.id}>{ii.name} ({ii.unit})</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        {idx === 0 && <Label className="text-[10px]">Qty Used</Label>}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ing.quantityUsed}
                          onChange={(e) => updateIngredient(idx, "quantityUsed", Number(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="w-12 text-[10px] text-muted-foreground pb-1">{ing.unit}</div>
                      <button onClick={() => removeIngredient(idx)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addIngredient}>
                      <Plus className="h-3 w-3" /> Add Ingredient
                    </Button>
                    {ingredientCost > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Ingredient cost: <strong className="text-success">${ingredientCost.toFixed(2)}</strong>
                        {form.price > 0 && <> · Margin: <strong>{((1 - ingredientCost / form.price) * 100).toFixed(1)}%</strong></>}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Modifiers (Size, Toppings, etc.) ── */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <button onClick={() => setShowModifiers(!showModifiers)} className="flex items-center gap-2 w-full text-left">
                <DollarSign className="h-4 w-4 text-info" />
                <span className="text-sm font-bold text-foreground flex-1">Modifiers — Options That Adjust Price</span>
                {showModifiers ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showModifiers && (
                <>
                  {form.modifiers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No modifiers. Add options like Size, Toppings, or Add-ons that change the price.</p>
                  )}
                  {form.modifiers.map((mod, modIdx) => (
                    <div key={modIdx} className="rounded-lg bg-background border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={mod.name}
                          onChange={(e) => updateModifier(modIdx, "name", e.target.value)}
                          placeholder="e.g. Size, Toppings, Add-ons"
                          className="h-8 text-sm font-semibold flex-1"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                          <input
                            type="checkbox"
                            checked={mod.required}
                            onChange={(e) => updateModifier(modIdx, "required", e.target.checked)}
                            className="rounded"
                          />
                          Required
                        </label>
                        <button onClick={() => removeModifier(modIdx)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {mod.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 ml-3">
                          <span className="text-muted-foreground/50 text-xs">•</span>
                          <Input
                            value={opt.label}
                            onChange={(e) => updateModifierOption(modIdx, optIdx, "label", e.target.value)}
                            placeholder="e.g. Large"
                            className="h-7 text-xs flex-1"
                          />
                          <div className="flex items-center gap-1 w-24">
                            <span className="text-[10px] text-muted-foreground">+$</span>
                            <Input
                              type="number"
                              step="0.25"
                              value={opt.priceAdjust}
                              onChange={(e) => updateModifierOption(modIdx, optIdx, "priceAdjust", Number(e.target.value))}
                              className="h-7 text-xs"
                            />
                          </div>
                          {mod.options.length > 1 && (
                            <button onClick={() => removeModifierOption(modIdx, optIdx)} className="p-0.5 text-muted-foreground hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 ml-3 gap-1" onClick={() => addModifierOption(modIdx)}>
                        <Plus className="h-2.5 w-2.5" /> Add Option
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addModifier}>
                    <Plus className="h-3 w-3" /> Add Modifier Group
                  </Button>
                </>
              )}
            </div>

            <Button className="w-full" onClick={handleSave} disabled={createItem.isPending || updateItem.isPending}>
              {(createItem.isPending || updateItem.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editId ? "Update" : "Add"} Item
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
