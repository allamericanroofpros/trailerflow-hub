import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCreateOrder } from "@/hooks/useOrders";
import { useActiveOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, ChefHat, Clock, CheckCircle, Loader2, ArrowLeft,
  Truck, X, ChevronUp, BarChart3, Package, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import POSSalesView from "@/components/pos/POSSalesView";
import POSInventoryView from "@/components/pos/POSInventoryView";
import POSReportView from "@/components/pos/POSReportView";

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
  const [view, setView] = useState<"register" | "orders" | "sales" | "inventory" | "report">("register");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Detect tablet-ish (<=1024px)
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth <= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
    // On compact, briefly show cart indicator
    if (isCompact && !mobileCartOpen) {
      // Haptic-like visual pulse handled by AnimatePresence on FAB
    }
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
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

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
      setMobileCartOpen(false);
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
    pending: <Clock className="h-5 w-5" />,
    preparing: <ChefHat className="h-5 w-5" />,
    ready: <CheckCircle className="h-5 w-5" />,
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

  // Swipe-to-dismiss for cart items
  const SwipeableCartItem = ({ item }: { item: CartItem }) => {
    const x = useMotionValue(0);
    const bg = useTransform(x, [-120, 0], ["hsl(0 68% 52%)", "transparent"]);

    const handleDragEnd = (_: any, info: PanInfo) => {
      if (info.offset.x < -100) {
        setCart((prev) => prev.filter((c) => c.menu_item_id !== item.menu_item_id));
        toast("Removed " + item.name, { duration: 1500 });
      }
    };

    return (
      <div className="relative overflow-hidden rounded-xl">
        {/* Delete background */}
        <motion.div
          className="absolute inset-0 flex items-center justify-end pr-5 rounded-xl"
          style={{ backgroundColor: bg }}
        >
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: -120, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="relative flex items-center gap-3 rounded-xl bg-background border-2 border-border p-3 touch-pan-y"
        >
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-card-foreground truncate">{item.name}</p>
            <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} ea</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateQuantity(item.menu_item_id, -1)}
              className="h-11 w-11 rounded-xl border-2 border-border flex items-center justify-center hover:bg-secondary active:scale-90 active:bg-primary/10 transition-all touch-manipulation"
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="w-10 text-center text-lg font-black">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.menu_item_id, 1)}
              className="h-11 w-11 rounded-xl border-2 border-border flex items-center justify-center hover:bg-secondary active:scale-90 active:bg-primary/10 transition-all touch-manipulation"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <p className="w-20 text-right text-base font-black text-card-foreground">
            ${(item.price * item.quantity).toFixed(2)}
          </p>
        </motion.div>
      </div>
    );
  };

  // Cart content (shared between sidebar and bottom sheet)
  const CartContent = () => (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <ShoppingCart className="h-12 w-12 mb-3 text-muted-foreground/20" />
            <p className="text-base font-medium">Tap items to add</p>
          </div>
        ) : (
          cart.map((item) => <SwipeableCartItem key={item.menu_item_id} item={item} />)
        )}
      </div>

      {/* Totals & Payment */}
      <div className="border-t-2 border-border px-4 py-4 space-y-4 bg-background/80 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
            <span className="font-semibold">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-black text-xl text-card-foreground pt-2 border-t-2 border-border">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {cart.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { method: "cash" as const, icon: Banknote, label: "Cash" },
                { method: "card" as const, icon: CreditCard, label: "Card" },
                { method: "digital" as const, icon: Smartphone, label: "Digital" },
              ].map(({ method, icon: Icon, label }) => (
                <Button
                  key={method}
                  size="lg"
                  variant="outline"
                  className="flex-col gap-1.5 h-auto py-4 text-base font-bold border-2 active:scale-95 active:bg-primary/10 transition-all touch-manipulation"
                  onClick={() => handleCheckout(method)}
                  disabled={createOrder.isPending}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm">{label}</span>
                </Button>
              ))}
            </div>
            <button
              onClick={() => { setCart([]); if (isCompact) setMobileCartOpen(false); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors touch-manipulation"
            >
              <Trash2 className="h-4 w-4" /> Clear Order
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background select-none">
      {/* ── TOP BAR ── */}
      <header className="flex h-16 items-center justify-between border-b-2 border-border bg-card px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all touch-manipulation"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Exit POS</span>
          </button>
          <div className="h-7 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Truck className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-base font-black text-foreground tracking-tight hidden sm:block">TrailerOS POS</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {[
            { key: "register" as const, label: "Register", icon: null },
            { key: "orders" as const, label: "Orders", icon: null, badge: activeOrders?.length },
            { key: "sales" as const, label: "Sales", icon: BarChart3 },
            { key: "inventory" as const, label: "Stock", icon: Package },
            { key: "report" as const, label: "Report", icon: FileText },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`relative shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 touch-manipulation flex items-center gap-1.5 ${
                view === key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{Icon ? "" : label}</span>
              {badge ? (
                <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-black text-destructive-foreground">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground hidden md:block font-medium">
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
            {/* Category Bar - scrollable with large touch targets */}
            <div className="flex items-center gap-2.5 border-b-2 border-border bg-card px-4 py-3 overflow-x-auto shrink-0 scrollbar-hide">
              <button
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-all active:scale-95 touch-manipulation ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-all active:scale-95 touch-manipulation ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>

            {/* Item Grid - larger cards for touch */}
            <div className="flex-1 overflow-y-auto p-4">
              {menuLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mr-3" /> Loading menu...
                </div>
              ) : !filteredItems?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <ShoppingCart className="h-16 w-16 mb-4 text-muted-foreground/20" />
                  <p className="text-xl font-bold">No menu items</p>
                  <p className="text-base mt-1">Add items in the Menu page to start selling.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredItems.map((item) => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price) })}
                      className="flex flex-col rounded-2xl border-2 border-border bg-card p-5 text-left hover:border-primary/40 hover:shadow-lg transition-all min-h-[120px] touch-manipulation"
                    >
                      <p className="text-base font-black text-card-foreground line-clamp-2 leading-tight">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 capitalize font-medium">
                        {categoryLabels[item.category] || item.category}
                      </p>
                      <p className="text-2xl font-black text-primary mt-auto pt-3">
                        ${Number(item.price).toFixed(2)}
                      </p>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Cart Sidebar */}
          {!isCompact && (
            <div className="w-[380px] shrink-0 border-l-2 border-border bg-card flex flex-col">
              <div className="flex items-center gap-2 border-b-2 border-border px-4 py-4">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h3 className="text-base font-black text-card-foreground">Current Order</h3>
                {itemCount > 0 && (
                  <Badge className="ml-auto bg-primary/10 text-primary text-xs font-bold">
                    {itemCount} items
                  </Badge>
                )}
              </div>
              <CartContent />
            </div>
          )}

          {/* Tablet/Mobile: Floating Cart Button + Bottom Sheet */}
          {isCompact && (
            <>
              {/* FAB */}
              <AnimatePresence>
                {!mobileCartOpen && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileCartOpen(true)}
                    className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl bg-primary px-6 py-4 text-primary-foreground shadow-2xl touch-manipulation"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {itemCount > 0 ? (
                      <>
                        <span className="text-lg font-black">${total.toFixed(2)}</span>
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-foreground/20 px-2 text-sm font-black">
                          {itemCount}
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-bold">Cart</span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Bottom Sheet Overlay */}
              <AnimatePresence>
                {mobileCartOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm"
                      onClick={() => setMobileCartOpen(false)}
                    />
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 28, stiffness: 300 }}
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={{ top: 0, bottom: 0.4 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 150 || info.velocity.y > 500) {
                          setMobileCartOpen(false);
                        }
                      }}
                      className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col bg-card rounded-t-3xl shadow-2xl touch-pan-y"
                      style={{ maxHeight: "85vh" }}
                    >
                      {/* Drag Handle */}
                      <div className="flex items-center justify-center pt-3 pb-1">
                        <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                      </div>
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b-2 border-border">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-black text-card-foreground">Current Order</h3>
                          {itemCount > 0 && (
                            <Badge className="bg-primary/10 text-primary text-xs font-bold">
                              {itemCount} items
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={() => setMobileCartOpen(false)}
                          className="h-10 w-10 rounded-xl flex items-center justify-center bg-secondary active:scale-90 transition-all touch-manipulation"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <CartContent />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      ) : (
        /* ── ORDERS VIEW ── */
        <div className="flex-1 overflow-y-auto p-4">
          {!activeOrders?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CheckCircle className="h-16 w-16 mb-4 text-muted-foreground/20" />
              <p className="text-xl font-bold">No active orders</p>
              <p className="text-base mt-1">Orders will appear here once placed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border-2 bg-card p-5 shadow-card space-y-4 ${
                    statusColor[order.status] ? "border-current " + statusColor[order.status].split(" ")[1] : "border-border"
                  }`}
                  style={{ borderColor: undefined }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-card-foreground">
                      #{order.order_number}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-black ${
                        statusColor[order.status] || "border-border"
                      }`}
                    >
                      {statusIcon[order.status]}
                      <span className="capitalize">{order.status}</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(order as any).order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-base">
                        <span className="text-muted-foreground">
                          <span className="font-black text-card-foreground">{item.quantity}×</span>{" "}
                          {item.menu_items?.name || "Item"}
                        </span>
                        <span className="font-bold text-card-foreground">
                          ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t-2 border-border pt-4">
                    <span className="text-2xl font-black text-card-foreground">
                      ${Number(order.total).toFixed(2)}
                    </span>
                    {nextStatus[order.status] && (
                      <Button
                        size="lg"
                        className="text-sm font-black px-6 py-3 h-auto rounded-xl active:scale-95 transition-all touch-manipulation"
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
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
