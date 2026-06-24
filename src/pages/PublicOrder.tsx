import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin, Clock, Minus, Plus, ShoppingBag, CalendarX } from "lucide-react";
import { toast } from "sonner";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
};

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const fnHeaders = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

export default function PublicOrder() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const url = `https://${projectId}.supabase.co/functions/v1/public-trailer-menu?slug=${encodeURIComponent(slug)}`;
        const r = await fetch(url, { headers: fnHeaders });
        setData(await r.json());
      } catch (e: any) {
        setData({ error: e.message });
      }
      setLoading(false);
    })();
  }, [slug]);

  const items: MenuItem[] = data?.menuItems ?? [];
  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {};
    for (const i of items) (g[i.category] ||= []).push(i);
    return g;
  }, [items]);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + Number(i.price) * (cart[i.id] ?? 0), 0),
    [items, cart]
  );
  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0);

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id]; else next[id] = n;
      return next;
    });

  // Build default pickup time options based on today's window
  const pickupOptions = useMemo(() => {
    const startStr = data?.booking?.start_time as string | undefined;
    const endStr = data?.booking?.end_time as string | undefined;
    if (!startStr) return [] as { value: string; label: string }[];
    const now = new Date();
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = (endStr ?? "23:59").split(":").map(Number);
    const start = new Date(now); start.setHours(sh, sm || 0, 0, 0);
    const end = new Date(now); end.setHours(eh, em || 0, 0, 0);
    const earliest = new Date(Math.max(now.getTime() + 15 * 60_000, start.getTime()));
    // round up to next 15
    earliest.setMinutes(Math.ceil(earliest.getMinutes() / 15) * 15, 0, 0);
    const opts: { value: string; label: string }[] = [];
    for (let t = new Date(earliest); t <= end && opts.length < 24; t = new Date(t.getTime() + 15 * 60_000)) {
      opts.push({
        value: t.toISOString(),
        label: t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      });
    }
    return opts;
  }, [data]);

  useEffect(() => {
    if (!pickupAt && pickupOptions.length) setPickupAt(pickupOptions[0].value);
  }, [pickupOptions, pickupAt]);

  const placeOrder = async () => {
    if (totalQty === 0) return toast.error("Add at least one item");
    if (!name || !email) return toast.error("Name and email required");
    setSubmitting(true);
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/place-online-order`;
      const r = await fetch(url, {
        method: "POST",
        headers: { ...fnHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          customer: { name, email, phone },
          items: Object.entries(cart).map(([menu_item_id, quantity]) => ({ menu_item_id, quantity })),
          pickup_at: pickupAt || null,
          notes: orderNotes || null,
        }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || "Order failed");

      // PAYMENT SEAM: when Square is connected, res.payment_url will be set.
      if (res.payment_url) {
        window.location.href = res.payment_url;
        return;
      }
      navigate(`/order/${slug}/success?order=${res.order.order_number}`);
    } catch (e: any) {
      toast.error(e.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data || data.error || !data.trailer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background">
        <div>
          <h1 className="text-xl font-bold">Trailer not found</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.error || "Check the link and try again."}</p>
        </div>
      </div>
    );
  }

  const { trailer, acceptingOrders, booking, forceClosed, enabled } = data;
  const closedReason = !enabled
    ? "Online ordering is currently off."
    : forceClosed
    ? "Temporarily closed — check back soon."
    : !booking?.location
    ? "Not open today — check back."
    : null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-2xl p-4">
          {trailer.image_url && (
            <img src={trailer.image_url} alt={trailer.name} className="h-32 w-full rounded-lg object-cover mb-3" />
          )}
          <h1 className="text-2xl font-bold tracking-tight">{trailer.name}</h1>
          {trailer.description && (
            <p className="text-sm text-muted-foreground mt-1">{trailer.description}</p>
          )}
          {acceptingOrders ? (
            <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="text-sm font-semibold text-primary">
                Ordering open — picking up at {booking.location}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {booking.location}</span>
                {(booking.start_time || booking.end_time) && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {booking.start_time?.slice(0, 5) ?? "?"}–{booking.end_time?.slice(0, 5) ?? "?"}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-md border bg-muted p-3 text-sm flex items-start gap-2">
              <CalendarX className="h-4 w-4 mt-0.5" />
              <span>{closedReason}</span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 space-y-6">
        {acceptingOrders && items.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No menu items available.
          </Card>
        )}

        {acceptingOrders && Object.entries(grouped).map(([category, list]) => (
          <section key={category}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {category}
            </h2>
            <div className="space-y-2">
              {list.map((m) => {
                const qty = cart[m.id] ?? 0;
                return (
                  <Card key={m.id} className="p-3 flex gap-3">
                    {m.image_url && (
                      <img src={m.image_url} alt={m.name} className="h-16 w-16 rounded object-cover" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{m.name}</div>
                      {m.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                      )}
                      <div className="mt-1 text-sm font-medium">${Number(m.price).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2 self-center">
                      {qty > 0 ? (
                        <>
                          <Button size="icon" variant="outline" onClick={() => dec(m.id)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center font-medium">{qty}</span>
                          <Button size="icon" onClick={() => inc(m.id)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => inc(m.id)}>Add</Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        {acceptingOrders && totalQty > 0 && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Pickup details</h2>
            <div>
              <Label>Pickup time</Label>
              {pickupOptions.length ? (
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                >
                  {pickupOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">As soon as possible.</p>
              )}
            </div>
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Payment will be collected via Square checkout once the vendor connects it. For now, pay at pickup.
            </p>
          </Card>
        )}
      </main>

      {acceptingOrders && totalQty > 0 && (
        <div className="fixed bottom-0 inset-x-0 border-t bg-card p-3">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">{totalQty} item{totalQty > 1 ? "s" : ""}</div>
              <div className="text-lg font-bold">${subtotal.toFixed(2)}</div>
            </div>
            <Button size="lg" onClick={placeOrder} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingBag className="h-4 w-4 mr-2" />}
              Place order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
