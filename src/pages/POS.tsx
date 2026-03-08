import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCreateOrder } from "@/hooks/useOrders";
import { useActiveOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, ChefHat, Clock, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
};

const TAX_RATE = 0.0875;

const categoryLabels: Record<string, string> = {
  appetizer: "Appetizers",
  entree: "Entrées",
  side: "Sides",
  dessert: "Desserts",
  drink: "Drinks",
  combo: "Combos",
  other: "Other",
};

export default function POS() {
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { data: activeOrders } = useActiveOrders();
  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleCheckout = async (paymentMethod: "cash" | "card" | "digital") => {
    if (cart.length === 0) return;
    try {
      await createOrder.mutateAsync({
        subtotal,
        tax,
        total,
        payment_method: paymentMethod,
        payment_received: true,
        items: cart.map((c) => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
          unit_price: c.price,
        })),
      });
      setCart([]);
      toast.success("Order placed!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const categories = menuItems
    ? Array.from(new Set(menuItems.map((i) => i.category)))
    : [];

  const filteredItems =
    activeCategory === "all"
      ? menuItems
      : menuItems?.filter((i) => i.category === activeCategory);

  const statusIcon = {
    pending: <Clock className="h-3.5 w-3.5" />,
    preparing: <ChefHat className="h-3.5 w-3.5" />,
    ready: <CheckCircle className="h-3.5 w-3.5" />,
  };

  const statusColor = {
    pending: "bg-warning/10 text-warning border-warning/20",
    preparing: "bg-info/10 text-info border-info/20",
    ready: "bg-success/10 text-success border-success/20",
  };

  const nextStatus: Record<string, string> = {
    pending: "preparing",
    preparing: "ready",
    ready: "served",
  };

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>

        <Tabs defaultValue="register" className="w-full">
          <TabsList>
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5">
              Orders
              {activeOrders?.length ? (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {activeOrders.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* ── REGISTER TAB ── */}
          <TabsContent value="register" className="mt-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Menu Grid */}
              <div className="lg:col-span-2 space-y-4">
                {/* Category Filters */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory("all")}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeCategory === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {categoryLabels[cat] || cat}
                    </button>
                  ))}
                </div>

                {menuLoading ? (
                  <div className="flex items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading menu...
                  </div>
                ) : !filteredItems?.length ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No menu items yet</p>
                    <p className="text-xs mt-1">Add items in the Menu page to start selling.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price) })}
                        className="flex flex-col items-start rounded-xl border border-border bg-card p-4 text-left shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all active:scale-[0.97]"
                      >
                        <p className="text-sm font-semibold text-card-foreground line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {categoryLabels[item.category] || item.category}
                        </p>
                        <p className="text-base font-bold text-primary mt-2">
                          ${Number(item.price).toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="rounded-xl border border-border bg-card shadow-card flex flex-col max-h-[calc(100vh-14rem)]">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Current Order
                  </h3>
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {cart.reduce((s, c) => s + c.quantity, 0)} items
                    </Badge>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Tap items to add
                    </p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.menu_item_id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${item.price.toFixed(2)} ea
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.menu_item_id, -1)}
                            className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.menu_item_id, 1)}
                            className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="w-16 text-right text-sm font-semibold text-card-foreground">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-card-foreground text-base">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => handleCheckout("cash")}
                        disabled={createOrder.isPending}
                      >
                        <Banknote className="h-3.5 w-3.5" /> Cash
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => handleCheckout("card")}
                        disabled={createOrder.isPending}
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Card
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => handleCheckout("digital")}
                        disabled={createOrder.isPending}
                      >
                        <Smartphone className="h-3.5 w-3.5" /> Digital
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => setCart([])}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Cart
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── ORDERS TAB ── */}
          <TabsContent value="orders" className="mt-4">
            {!activeOrders?.length ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium">No active orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-card-foreground">
                        #{order.order_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          statusColor[order.status as keyof typeof statusColor] || ""
                        }`}
                      >
                        {statusIcon[order.status as keyof typeof statusIcon]}
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {(order as any).order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {item.quantity}× {item.menu_items?.name || "Item"}
                          </span>
                          <span className="font-medium text-card-foreground">
                            ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-sm font-bold text-card-foreground">
                        ${Number(order.total).toFixed(2)}
                      </span>
                      {nextStatus[order.status] && (
                        <Button
                          size="sm"
                          className="text-xs h-7"
                          onClick={() =>
                            updateStatus.mutate(
                              { id: order.id, status: nextStatus[order.status] },
                              { onError: (e) => toast.error(e.message) }
                            )
                          }
                        >
                          {order.status === "pending"
                            ? "Start Prep"
                            : order.status === "preparing"
                            ? "Mark Ready"
                            : "Mark Served"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
