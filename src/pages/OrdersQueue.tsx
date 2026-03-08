import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useActiveOrders, useUpdateOrderStatus, useOrders } from "@/hooks/useOrders";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Clock, ChefHat, CheckCircle, Loader2, Receipt, Bell,
  ArrowRight, XCircle, Timer, Utensils, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import POSOrderHistory from "@/components/pos/POSOrderHistory";

const statusConfig: Record<string, { icon: React.ReactNode; label: string; bg: string; border: string; text: string }> = {
  pending: { icon: <Clock className="h-5 w-5" />, label: "NEW", bg: "bg-warning/15", border: "border-warning/40", text: "text-warning" },
  preparing: { icon: <ChefHat className="h-5 w-5" />, label: "PREP", bg: "bg-info/15", border: "border-info/40", text: "text-info" },
  ready: { icon: <Bell className="h-5 w-5" />, label: "READY", bg: "bg-success/15", border: "border-success/40", text: "text-success" },
};

const nextStatus: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

const bumpLabel: Record<string, string> = {
  pending: "START",
  preparing: "DONE",
  ready: "BUMP",
};

function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState("");
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${String(s).padStart(2, "0")}`);
      setIsLate(m >= 10);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-mono text-sm font-black tabular-nums",
      isLate ? "text-destructive" : "text-muted-foreground"
    )}>
      <Timer className="h-4 w-4" />
      {elapsed}
      {isLate && <AlertTriangle className="h-3.5 w-3.5" />}
    </span>
  );
}

export default function OrdersQueue() {
  const { data: activeOrders, isLoading } = useActiveOrders();
  const updateStatus = useUpdateOrderStatus();
  const [filter, setFilter] = useState<"all" | "pending" | "preparing" | "ready">("all");

  const grouped = useMemo(() => {
    if (!activeOrders) return { pending: [], preparing: [], ready: [] };
    return {
      pending: activeOrders.filter((o) => o.status === "pending"),
      preparing: activeOrders.filter((o) => o.status === "preparing"),
      ready: activeOrders.filter((o) => o.status === "ready"),
    };
  }, [activeOrders]);

  const displayed = useMemo(() => {
    if (!activeOrders) return [];
    if (filter === "all") return activeOrders;
    return activeOrders.filter((o) => o.status === filter);
  }, [activeOrders, filter]);

  const handleBump = (orderId: string, currentStatus: string) => {
    const next = nextStatus[currentStatus];
    if (!next) return;
    updateStatus.mutate(
      { id: orderId, status: next },
      {
        onSuccess: () => {
          if (next === "served") {
            toast.success("Order bumped — served!");
          }
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  const handleCancel = (orderId: string) => {
    updateStatus.mutate(
      { id: orderId, status: "cancelled" },
      {
        onSuccess: () => toast.success("Order cancelled"),
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-3 shrink-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Kitchen Display</h1>
            <p className="text-sm text-muted-foreground">Tap order to bump to next stage</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-sm font-black px-3 py-1.5 rounded-xl border-2", grouped.pending.length > 0 && "border-warning/40 text-warning bg-warning/10")}>
              {grouped.pending.length} New
            </Badge>
            <Badge variant="outline" className={cn("text-sm font-black px-3 py-1.5 rounded-xl border-2", grouped.preparing.length > 0 && "border-info/40 text-info bg-info/10")}>
              {grouped.preparing.length} Prep
            </Badge>
            <Badge variant="outline" className={cn("text-sm font-black px-3 py-1.5 rounded-xl border-2", grouped.ready.length > 0 && "border-success/40 text-success bg-success/10")}>
              {grouped.ready.length} Ready
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="active" className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-3 px-2 shrink-0">
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <Utensils className="h-4 w-4" />
                Bump Screen
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Receipt className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Status filter pills */}
            <div className="flex gap-1.5 ml-auto">
              {(["all", "pending", "preparing", "ready"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all",
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="active" className="flex-1 min-h-0 overflow-y-auto mt-3 px-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading orders...
              </div>
            ) : !displayed.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <CheckCircle className="h-20 w-20 mb-4 text-muted-foreground/15" />
                <p className="text-xl font-black">All clear!</p>
                <p className="text-base mt-1">No active orders right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
                <AnimatePresence mode="popLayout">
                  {displayed.map((order) => {
                    const sc = statusConfig[order.status] || statusConfig.pending;
                    const customerNote = order.notes?.startsWith("Customer: ")
                      ? order.notes.replace("Customer: ", "")
                      : null;
                    const kitchenNote = order.notes && !order.notes.startsWith("Customer: ")
                      ? order.notes
                      : null;

                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                        className={cn(
                          "rounded-2xl border-2 bg-card shadow-sm flex flex-col overflow-hidden",
                          sc.border
                        )}
                      >
                        {/* Card Header */}
                        <div className={cn("flex items-center justify-between px-4 py-3", sc.bg)}>
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-black text-card-foreground">
                              #{order.order_number}
                            </span>
                            <span className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-xs font-black uppercase",
                              sc.border, sc.text
                            )}>
                              {sc.icon}
                              {sc.label}
                            </span>
                          </div>
                          <ElapsedTimer createdAt={order.created_at} />
                        </div>

                        {/* Customer name */}
                        {customerNote && (
                          <div className="px-4 pt-2">
                            <p className="text-sm font-bold text-primary truncate">👤 {customerNote}</p>
                          </div>
                        )}

                        {/* Items list — the full order */}
                        <div className="flex-1 px-4 py-3 space-y-1.5">
                          {(order as any).order_items?.map((item: any) => {
                            const modifiers = item.modifiers as any[];
                            const hasModifiers = modifiers && modifiers.length > 0;

                            return (
                              <div key={item.id} className="space-y-0.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-baseline gap-2 min-w-0">
                                    <span className="text-xl font-black text-card-foreground shrink-0">
                                      {item.quantity}×
                                    </span>
                                    <span className="text-base font-bold text-card-foreground truncate">
                                      {item.menu_items?.name || "Item"}
                                    </span>
                                  </div>
                                </div>
                                {/* Modifiers */}
                                {hasModifiers && (
                                  <div className="ml-8 space-y-0.5">
                                    {modifiers.map((mod: any, mi: number) => (
                                      <p key={mi} className="text-xs font-semibold text-muted-foreground">
                                        + {mod.name || mod.label || JSON.stringify(mod)}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {/* Item notes */}
                                {item.notes && (
                                  <p className="ml-8 text-xs font-bold text-warning italic">
                                    ⚠ {item.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Kitchen notes */}
                        {kitchenNote && (
                          <div className="mx-4 mb-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2">
                            <p className="text-xs font-bold text-warning">📝 {kitchenNote}</p>
                          </div>
                        )}

                        {/* Action footer */}
                        <div className="flex items-stretch border-t-2 border-border">
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="flex items-center justify-center px-4 py-3 text-destructive hover:bg-destructive/10 transition-colors border-r border-border"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleBump(order.id, order.status)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-4 text-base font-black uppercase tracking-wider transition-all active:scale-[0.97] touch-manipulation",
                              order.status === "pending" && "bg-warning/20 text-warning hover:bg-warning/30",
                              order.status === "preparing" && "bg-info/20 text-info hover:bg-info/30",
                              order.status === "ready" && "bg-success/20 text-success hover:bg-success/30"
                            )}
                          >
                            {bumpLabel[order.status] || "BUMP"}
                            <ArrowRight className="h-5 w-5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 overflow-hidden">
            <POSOrderHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
