import { AppLayout } from "@/components/layout/AppLayout";
import { useActiveOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import POSOrderHistory from "@/components/pos/POSOrderHistory";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Clock, ChefHat, CheckCircle, Loader2, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function OrdersQueue() {
  const { data: activeOrders, isLoading } = useActiveOrders();
  const updateStatus = useUpdateOrderStatus();

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders & Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor active orders and view history — perfect for a second screen.
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Clock className="h-4 w-4" />
              Active Orders
              {activeOrders?.length ? (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {activeOrders.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Receipt className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading orders...
              </div>
            ) : !activeOrders?.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <CheckCircle className="h-16 w-16 mb-4 text-muted-foreground/20" />
                <p className="text-xl font-bold">No active orders</p>
                <p className="text-base mt-1">Orders will appear here once placed from POS.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeOrders.map((order) => {
                  const customerNote = order.notes?.startsWith("Customer: ") ? order.notes.replace("Customer: ", "") : null;
                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border-2 bg-card p-5 shadow-card space-y-4 border-border"
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
          </TabsContent>

          <TabsContent value="history">
            <POSOrderHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
