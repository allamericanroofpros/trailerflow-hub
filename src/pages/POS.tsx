import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCreateOrder } from "@/hooks/useOrders";
import { useActiveOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, ChefHat, Clock, CheckCircle, Loader2, ArrowLeft,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const navigate = useNavigate();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { data: activeOrders } = useActiveOrders();
  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [view, setView] = useState<"register" | "orders">("register");

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

  const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4" />,
    preparing: <ChefHat className="h-4 w-4" />,
    ready: <CheckCircle className="h-4 w-4" />,
  };

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/30",
    preparing: "bg-info/10 text-info border-info/30",
    ready: "bg-success/10 text-success border-success/30",
  };

  const nextStatus: Record<string, string> = {
    pending: "preparing",
    preparing: "ready",
    ready: "served",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── TOP BAR ── */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit POS
          </button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">TrailerOS POS</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("register")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "register"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Register
          </button>
          <button
            onClick={() => setView("orders")}
            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "orders"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Orders
            {activeOrders?.length ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {activeOrders.length}
              </span>
            ) : null}
          </button>
        </div>

        <p className="text-xs text-muted-foreground hidden md:block">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          {" · "}
          {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </header>

      {/* ── MAIN CONTENT ── */}
      {view === "register" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Menu Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Category Bar */}
            <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>

            {/* Item Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {menuLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading menu...
                </div>
              ) : !filteredItems?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <ShoppingCart className="h-14 w-14 mb-4 text-muted-foreground/30" />
                  <p className="text-lg font-medium">No menu items</p>
                  <p className="text-sm mt-1">Add items in the Menu page to start selling.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price) })}
                      className="flex flex-col rounded-xl border-2 border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.96] active:bg-primary/5"
                    >
                      <p className="text-sm font-bold text-card-foreground line-clamp-2 leading-tight">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {categoryLabels[item.category] || item.category}
                      </p>
                      <p className="text-xl font-black text-primary mt-auto pt-3">
                        ${Number(item.price).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="w-[340px] shrink-0 border-l border-border bg-card flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-card-foreground">Current Order</h3>
              {cart.length > 0 && (
                <Badge className="ml-auto bg-primary/10 text-primary text-[10px]">
                  {cart.reduce((s, c) => s + c.quantity, 0)} items
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mb-3 text-muted-foreground/20" />
                  <p className="text-sm">Tap items to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.menu_item_id} className="flex items-center gap-2 rounded-lg bg-background border border-border p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} ea</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, -1)}
                        className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary active:scale-95"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, 1)}
                        className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="w-16 text-right text-sm font-bold text-card-foreground">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Payment */}
            <div className="border-t border-border px-4 py-4 space-y-4 bg-background/50">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-lg text-card-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {cart.length > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-col gap-1 h-auto py-3"
                      onClick={() => handleCheckout("cash")}
                      disabled={createOrder.isPending}
                    >
                      <Banknote className="h-5 w-5" />
                      <span className="text-xs">Cash</span>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-col gap-1 h-auto py-3"
                      onClick={() => handleCheckout("card")}
                      disabled={createOrder.isPending}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="text-xs">Card</span>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-col gap-1 h-auto py-3"
                      onClick={() => handleCheckout("digital")}
                      disabled={createOrder.isPending}
                    >
                      <Smartphone className="h-5 w-5" />
                      <span className="text-xs">Digital</span>
                    </Button>
                  </div>
                  <button
                    onClick={() => setCart([])}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear Order
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── ORDERS VIEW ── */
        <div className="flex-1 overflow-y-auto p-4">
          {!activeOrders?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CheckCircle className="h-14 w-14 mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium">No active orders</p>
              <p className="text-sm mt-1">Orders will appear here once placed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 bg-card p-4 shadow-card space-y-3 ${
                    statusColor[order.status] ? "border-current " + statusColor[order.status].split(" ")[1] : "border-border"
                  }`}
                  style={{ borderColor: undefined }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-card-foreground">
                      #{order.order_number}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                        statusColor[order.status] || "border-border"
                      }`}
                    >
                      {statusIcon[order.status]}
                      <span className="capitalize">{order.status}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {(order as any).order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          <span className="font-bold text-card-foreground">{item.quantity}×</span>{" "}
                          {item.menu_items?.name || "Item"}
                        </span>
                        <span className="font-medium text-card-foreground">
                          ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-lg font-black text-card-foreground">
                      ${Number(order.total).toFixed(2)}
                    </span>
                    {nextStatus[order.status] && (
                      <Button
                        size="sm"
                        className="text-xs font-bold"
                        onClick={() =>
                          updateStatus.mutate(
                            { id: order.id, status: nextStatus[order.status] },
                            { onError: (e: any) => toast.error(e.message) }
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
        </div>
      )}
    </div>
  );
}
