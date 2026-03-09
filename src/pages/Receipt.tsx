import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Loader2, Truck, Receipt } from "lucide-react";

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["receipt", orderId],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-receipt?order_id=${orderId}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Receipt not found");
      return res.json();
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-lg font-bold text-card-foreground">Receipt not found</p>
          <p className="text-sm text-muted-foreground">This receipt may have expired or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const items = order.order_items || [];
  const date = new Date(order.created_at);

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border-2 border-border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 text-center border-b border-border">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Truck className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-black text-card-foreground tracking-tight">VendorFlow</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              {" · "}
              {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="text-2xl font-black text-card-foreground mt-2">
              Order #{order.order_number}
            </p>
          </div>

          {/* Items */}
          <div className="px-6 py-4 space-y-2.5">
            {items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-black text-card-foreground">{item.quantity}×</span>{" "}
                  {item.notes?.startsWith("Custom: ") ? item.notes.replace("Custom: ", "") : item.menu_items?.name || "Item"}
                </span>
                <span className="font-bold text-card-foreground">
                  ${(Number(item.unit_price) * item.quantity).toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-border space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-semibold">${Number(order.subtotal).toFixed(1)}</span>
            </div>
            {order.tax_inclusive ? (
              Number(order.tax) > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground/70 italic">
                  <span>Includes {order.tax_label || "Tax"}</span>
                  <span>${Number(order.tax).toFixed(1)}</span>
                </div>
              )
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{order.tax_label || "Tax"}</span>
                <span className="font-semibold">${Number(order.tax).toFixed(1)}</span>
              </div>
            )}
            {Number(order.tip) > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tip</span>
                <span className="font-semibold">${Number(order.tip).toFixed(1)}</span>
              </div>
            )}
            {Number(order.surcharge_amount) > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{order.surcharge_label || "Non-Cash Adjustment"}</span>
                <span className="font-semibold">${Number(order.surcharge_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-card-foreground pt-2 border-t border-border">
              <span>Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="px-6 py-3 bg-secondary/30 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-bold text-card-foreground capitalize">
                {order.payment_method || "—"}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">Thank you for your order!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
