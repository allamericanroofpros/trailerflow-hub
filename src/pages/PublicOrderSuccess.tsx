import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function PublicOrderSuccess() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return setStatus("error");
    let cancelled = false;
    const poll = async () => {
      try {
        const url = `https://vtobvrsbmymcdfwzcigo.supabase.co/functions/v1/confirm-online-order?session_id=${encodeURIComponent(sessionId)}`;
        const r = await fetch(url);
        const data = await r.json();
        if (cancelled) return;
        if (data.paid) {
          setOrder(data.order);
          setStatus("paid");
        } else {
          setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="p-6 max-w-md w-full text-center space-y-3">
        {status === "loading" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p>Confirming your payment…</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold">Order confirmed!</h1>
            {order?.order_number && (
              <p className="text-sm">Order #{order.order_number}</p>
            )}
            <p className="text-sm text-muted-foreground">
              The kitchen has been notified. Pick up when ready.
            </p>
            <Button asChild variant="outline">
              <Link to={`/order/${slug}`}>Order again</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <p className="font-semibold">Couldn't confirm your order</p>
            <p className="text-sm text-muted-foreground">
              If you were charged, contact the vendor with your payment receipt.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
