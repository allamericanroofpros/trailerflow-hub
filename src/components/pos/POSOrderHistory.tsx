import { useState, useMemo } from "react";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Calendar, CreditCard, Banknote, Smartphone,
  DollarSign, ChevronRight, X, Loader2, Edit3, Trash2, CheckCircle,
  Clock, ChefHat, XCircle, Receipt,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type OrderFilter = "all" | "today" | "week" | "month";
type StatusFilter = "all" | "pending" | "preparing" | "ready" | "served" | "cancelled";

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
  preparing: { icon: <ChefHat className="h-4 w-4" />, color: "bg-info/10 text-info border-info/30", label: "Preparing" },
  ready: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-success/10 text-success border-success/30", label: "Ready" },
  served: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-primary/10 text-primary border-primary/30", label: "Served" },
  cancelled: { icon: <XCircle className="h-4 w-4" />, color: "bg-destructive/10 text-destructive border-destructive/30", label: "Cancelled" },
};

const paymentIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  digital: <Smartphone className="h-4 w-4" />,
  other: <DollarSign className="h-4 w-4" />,
};

export default function POSOrderHistory() {
  const { data: orders, isLoading, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<OrderFilter>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    if (!orders) return [];
    let result = [...orders];

    // Date filter
    const now = new Date();
    if (dateFilter === "today") {
      const today = now.toDateString();
      result = result.filter((o) => new Date(o.created_at).toDateString() === today);
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      result = result.filter((o) => new Date(o.created_at) >= weekAgo);
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      result = result.filter((o) => new Date(o.created_at) >= monthAgo);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Search by order number or notes
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          String(o.order_number).includes(q) ||
          (o.notes && o.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [orders, dateFilter, statusFilter, search]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
      }
      toast.success(`Order updated to ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ notes } as any)
        .eq("id", selectedOrder.id);
      if (error) throw error;
      setSelectedOrder((prev: any) => prev ? { ...prev, notes } : null);
      setEditingNotes(false);
      refetch();
      toast.success("Notes saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRefund = async (orderId: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: "cancelled" });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, status: "cancelled" } : null);
      }
      toast.success("Order cancelled / refunded");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-3" /> Loading order history...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-border bg-card px-4 py-3 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order # or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-2 text-sm"
          />
        </div>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as OrderFilter)}>
          <SelectTrigger className="w-[130px] h-11 rounded-xl border-2 font-bold text-sm">
            <Calendar className="h-4 w-4 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px] h-11 rounded-xl border-2 font-bold text-sm">
            <Filter className="h-4 w-4 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="served">Served</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-sm font-bold px-3 py-2">
          {filtered.length} orders
        </Badge>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Receipt className="h-16 w-16 mb-4 text-muted-foreground/20" />
            <p className="text-xl font-bold">No orders found</p>
            <p className="text-base mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              const itemCount = (order as any).order_items?.reduce(
                (s: number, i: any) => s + i.quantity, 0
              ) || 0;

              return (
                <motion.button
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedOrder(order);
                    setNotes(order.notes || "");
                    setEditingNotes(false);
                  }}
                  className="w-full flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 hover:border-primary/30 hover:shadow-md active:scale-[0.99] transition-all touch-manipulation text-left"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-lg">
                    #{order.order_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-card-foreground">
                        ${Number(order.total).toFixed(2)}
                      </p>
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {itemCount} items · {order.payment_method || "—"} ·{" "}
                      {new Date(order.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-2xl font-black">Order #{selectedOrder.order_number}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 text-sm font-bold ${
                      (statusConfig[selectedOrder.status] || statusConfig.pending).color
                    }`}
                  >
                    {(statusConfig[selectedOrder.status] || statusConfig.pending).icon}
                    {(statusConfig[selectedOrder.status] || statusConfig.pending).label}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Time */}
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedOrder.created_at).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(selectedOrder.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Items</h4>
                  {(selectedOrder as any).order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-card-foreground">
                        <span className="font-black">{item.quantity}×</span>{" "}
                        {item.menu_items?.name || "Item"}
                        {item.notes && (
                          <span className="text-muted-foreground ml-1">({item.notes})</span>
                        )}
                      </span>
                      <span className="font-bold">${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t-2 border-border pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{selectedOrder.tax_label || "Tax"}</span>
                    <span>${Number(selectedOrder.tax).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.tip) > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Tip</span>
                      <span>${Number(selectedOrder.tip).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.surcharge_amount) > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{selectedOrder.surcharge_label || "Non-Cash Adjustment"}</span>
                      <span>${Number(selectedOrder.surcharge_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-black text-card-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>${Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="flex items-center gap-2 text-sm">
                  {paymentIcons[selectedOrder.payment_method || "other"]}
                  <span className="font-bold capitalize">{selectedOrder.payment_method || "—"}</span>
                  {selectedOrder.payment_received && (
                    <Badge variant="secondary" className="text-xs">Paid</Badge>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Notes</h4>
                    <button
                      onClick={() => setEditingNotes(!editingNotes)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add order notes..."
                        className="h-10 rounded-xl border-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="rounded-xl font-bold" onClick={handleSaveNotes}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl font-bold"
                          onClick={() => { setEditingNotes(false); setNotes(selectedOrder.notes || ""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.notes || "No notes"}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedOrder.status !== "served" && selectedOrder.status !== "cancelled" && (
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(v) => handleStatusChange(selectedOrder.id, v)}
                    >
                      <SelectTrigger className="flex-1 h-11 rounded-xl border-2 font-bold text-sm">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="served">Served</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {selectedOrder.status !== "cancelled" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-xl font-bold h-11 px-4"
                      onClick={() => handleRefund(selectedOrder.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" /> Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
