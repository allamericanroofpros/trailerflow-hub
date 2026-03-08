import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useCreateOrder } from "@/hooks/useOrders";
import { useActiveOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote,
  Smartphone, ChefHat, Clock, CheckCircle, Loader2, ArrowLeft,
  Truck, X, BarChart3, Package, FileText, Receipt, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import POSSalesView from "@/components/pos/POSSalesView";
import POSInventoryView from "@/components/pos/POSInventoryView";
import POSReportView from "@/components/pos/POSReportView";
import POSCheckoutFlow from "@/components/pos/POSCheckoutFlow";
import POSConfirmation from "@/components/pos/POSConfirmation";
import POSOrderHistory from "@/components/pos/POSOrderHistory";
import POSEndOfDay from "@/components/pos/POSEndOfDay";
import POSStartOfDay from "@/components/pos/POSStartOfDay";
import POSTimeClock from "@/components/pos/POSTimeClock";
import { useActiveClocks, useStaffByPin } from "@/hooks/useTimeClock";

type Modifier = {
  name: string;
  options: { label: string; priceAdjust: number; inventoryAdjustments?: { inventoryItemId: string; extraQty: number }[] }[];
  required: boolean;
};

type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  selectedModifiers?: { groupName: string; label: string; priceAdjust: number; inventoryAdjustments?: { inventoryItemId: string; extraQty: number }[] }[];
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
  const [sodComplete, setSodComplete] = useState(() => {
    return sessionStorage.getItem("pos_sod_complete") === "true";
  });
  const [sodData, setSodData] = useState<{ trailerId: string | null; eventId: string | null; openingCash: number; notes: string } | null>(() => {
    const saved = sessionStorage.getItem("pos_sod_data");
    return saved ? JSON.parse(saved) : null;
  });

  // PIN gate for register
  const [posStaffName, setPosStaffName] = useState<string | null>(() => sessionStorage.getItem("pos_staff_name"));
  const [posPin, setPosPin] = useState("");
  const staffByPin = useStaffByPin();
  const { data: activeClocks } = useActiveClocks();

  const activeTrailerId = sodData?.trailerId || undefined;
  const { data: menuItems, isLoading: menuLoading } = useMenuItems(activeTrailerId);
  const { data: activeOrders } = useActiveOrders();
  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [view, setView] = useState<"register" | "orders" | "history" | "sales" | "inventory" | "report" | "timeclock">("register");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showModifierPicker, setShowModifierPicker] = useState<{ item: any; modifiers: Modifier[] } | null>(null);
  const [pendingModifiers, setPendingModifiers] = useState<Record<string, { label: string; priceAdjust: number; inventoryAdjustments?: { inventoryItemId: string; extraQty: number }[] }[]>>({});
  const [showEOD, setShowEOD] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [confirmation, setConfirmation] = useState<{
    orderNumber: number;
    items: { name: string; quantity: number; price: number }[];
    subtotal: number; tax: number; tip: number; total: number;
    paymentMethod: string; cashTendered?: number; changeDue?: number;
    orderId: string;
  } | null>(null);
  // Detect tablet-ish (<=1024px)
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth <= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const addToCart = (item: { id: string; name: string; price: number }, selectedModifiers?: CartItem["selectedModifiers"]) => {
    const modExtra = selectedModifiers?.reduce((s, m) => s + m.priceAdjust, 0) || 0;
    const finalPrice = Number(item.price) + modExtra;
    const modSuffix = selectedModifiers?.length ? ` (${selectedModifiers.map(m => m.label).join(", ")})` : "";
    const cartKey = item.id + modSuffix;

    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === cartKey);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === cartKey ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menu_item_id: cartKey, name: item.name + modSuffix, price: finalPrice, quantity: 1, selectedModifiers }];
    });
  };

  const handleItemTap = (item: any) => {
    const modifiers: Modifier[] = Array.isArray(item.modifiers) ? item.modifiers : [];
    if (modifiers.length > 0) {
      setShowModifierPicker({ item, modifiers });
      setPendingModifiers({});
    } else {
      addToCart({ id: item.id, name: item.name, price: Number(item.price) });
    }
  };

  const confirmModifiers = () => {
    if (!showModifierPicker) return;
    const { item, modifiers } = showModifierPicker;
    // Check required
    for (const mod of modifiers) {
      if (mod.required && (!pendingModifiers[mod.name] || pendingModifiers[mod.name].length === 0)) {
        toast.error(`Please select ${mod.name}`);
        return;
      }
    }
    const selected = Object.entries(pendingModifiers).flatMap(([groupName, opts]) =>
      opts.map((opt) => ({ groupName, ...opt }))
    );
    addToCart({ id: item.id, name: item.name, price: Number(item.price) }, selected.length > 0 ? selected : undefined);
    setShowModifierPicker(null);
    setPendingModifiers({});
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

  const handleCheckout = async (data: {
    paymentMethod: "cash" | "card" | "digital";
    tip: number;
    cashTendered?: number;
  }) => {
    if (cart.length === 0) return;
    const tipAmount = data.tip;
    const grandTotal = total + tipAmount;
    try {
      const newOrder = await createOrder.mutateAsync({
        subtotal,
        tax,
        total: grandTotal,
        tip: tipAmount,
        payment_method: data.paymentMethod,
        payment_received: true,
        trailer_id: sodData?.trailerId || undefined,
        event_id: sodData?.eventId || undefined,
        notes: [
          customerName.trim() ? `Customer: ${customerName.trim()}` : "",
          specialInstructions.trim() ? `Instructions: ${specialInstructions.trim()}` : "",
        ].filter(Boolean).join(" | ") || undefined,
        items: cart.map((c) => {
          const modifiersForDb = c.selectedModifiers?.length
            ? c.selectedModifiers.map(m => ({
                name: m.groupName,
                selectedOptions: [{
                  label: m.label,
                  priceAdjust: m.priceAdjust,
                  inventoryAdjustments: m.inventoryAdjustments || [],
                }],
              }))
            : undefined;
          return {
            menu_item_id: c.menu_item_id.split(" (")[0],
            quantity: c.quantity,
            unit_price: c.price,
            modifiers: modifiersForDb,
          };
        }),
      });
      const changeDue = data.cashTendered ? data.cashTendered - grandTotal : undefined;
      setConfirmation({
        orderNumber: (newOrder as any).order_number,
        items: cart.map((c) => ({ name: c.name, quantity: c.quantity, price: c.price })),
        subtotal, tax, tip: tipAmount, total: grandTotal,
        paymentMethod: data.paymentMethod,
        cashTendered: data.cashTendered,
        changeDue,
        orderId: (newOrder as any).id,
      });
      setCart([]);
      setCustomerName("");
      setSpecialInstructions("");
      setMobileCartOpen(false);
      setShowCheckout(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // No custom items — all items come from the menu

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

        {/* Customer Name */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Customer Name *</label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter name for order"
            className="mt-1 h-12 rounded-xl border-2 text-base font-semibold"
          />
        </div>

        {/* Special Instructions */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Special Instructions</label>
          <Input
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Allergies, preferences, etc."
            className="mt-1 h-12 rounded-xl border-2 text-base"
          />
        </div>

        {cart.length > 0 && (
          <>
            <Button
              size="lg"
              className="w-full h-14 text-base font-black rounded-xl active:scale-95 touch-manipulation"
              onClick={() => {
                if (!customerName.trim()) {
                  toast.error("Please enter a customer name before checkout");
                  return;
                }
                setShowCheckout(true);
              }}
              disabled={createOrder.isPending}
            >
              Charge ${total.toFixed(2)}
            </Button>
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

  // Start of Day gate
  if (!sodComplete) {
    return (
      <POSStartOfDay
        onComplete={(data) => {
          setSodData(data);
          setSodComplete(true);
          sessionStorage.setItem("pos_sod_complete", "true");
          sessionStorage.setItem("pos_sod_data", JSON.stringify(data));
        }}
      />
    );
  }

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
            { key: "timeclock" as const, label: "Clock", icon: Clock },
            { key: "history" as const, label: "History", icon: Receipt },
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
                      onClick={() => handleItemTap(item)}
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
      ) : view === "orders" ? (
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
              {activeOrders.map((order) => {
                const customerNote = order.notes?.startsWith("Customer: ") ? order.notes.replace("Customer: ", "") : null;
                return (
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
                    <div>
                      <span className="text-2xl font-black text-card-foreground">
                        #{order.order_number}
                      </span>
                      {customerNote && (
                        <p className="text-sm font-semibold text-primary mt-0.5">{customerNote}</p>
                      )}
                    </div>
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
                );
              })}
            </div>
          )}
        </div>
      ) : view === "timeclock" ? (
        <POSTimeClock eventId={sodData?.eventId} trailerId={sodData?.trailerId} />
      ) : view === "history" ? (
        <POSOrderHistory />
      ) : view === "sales" ? (
        <POSSalesView />
      ) : view === "inventory" ? (
        <POSInventoryView />
      ) : (
        <POSReportView />
      )}

      {/* Checkout Flow */}
      {showCheckout && cart.length > 0 && (
        <POSCheckoutFlow
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onComplete={handleCheckout}
          onCancel={() => setShowCheckout(false)}
          isPending={createOrder.isPending}
        />
      )}

      {/* Order Confirmation */}
      {confirmation && (
        <POSConfirmation
          {...confirmation}
          onDone={() => setConfirmation(null)}
        />
      )}

      {/* Modifier Picker Dialog */}
      <Dialog open={!!showModifierPicker} onOpenChange={(v) => { if (!v) setShowModifierPicker(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{showModifierPicker?.item?.name} — Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {showModifierPicker?.modifiers.map((mod) => (
              <div key={mod.name}>
                <p className="text-sm font-bold text-card-foreground mb-2">{mod.name} {mod.required && <span className="text-destructive">*</span>}</p>
                <div className="grid grid-cols-2 gap-2">
                  {mod.options.map((opt) => {
                    const isSelected = (pendingModifiers[mod.name] || []).some(s => s.label === opt.label);
                    return (
                      <button
                        key={opt.label}
                        onClick={() => setPendingModifiers(prev => {
                          const current = prev[mod.name] || [];
                          const exists = current.some(s => s.label === opt.label);
                          return {
                            ...prev,
                            [mod.name]: exists
                              ? current.filter(s => s.label !== opt.label)
                              : [...current, { label: opt.label, priceAdjust: opt.priceAdjust, inventoryAdjustments: opt.inventoryAdjustments }],
                          };
                        })}
                        className={`rounded-xl border-2 p-3 text-left transition-all active:scale-95 touch-manipulation flex items-center gap-2 ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                        }`}>
                          {isSelected && <span className="text-primary-foreground text-xs font-black">✓</span>}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-card-foreground">{opt.label}</p>
                          {opt.priceAdjust !== 0 && (
                            <p className="text-xs text-primary font-semibold">+${opt.priceAdjust.toFixed(2)}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button className="w-full h-12 font-black rounded-xl" onClick={confirmModifiers}>
              Add to Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* End of Day */}
      {showEOD && <POSEndOfDay
        openingCash={sodData?.openingCash || 0}
        trailerId={sodData?.trailerId}
        onClose={() => {
          setShowEOD(false);
          sessionStorage.removeItem("pos_sod_complete");
          sessionStorage.removeItem("pos_sod_data");
          setSodComplete(false);
          setSodData(null);
          navigate("/");
        }}
      />}

      {/* EOD Floating Button */}
      <button
        onClick={() => setShowEOD(true)}
        className="fixed bottom-6 left-6 z-[55] flex items-center gap-2 rounded-2xl bg-card border-2 border-border px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 shadow-lg transition-all touch-manipulation"
      >
        <Moon className="h-4 w-4" /> End of Day
      </button>
    </div>
  );
}
