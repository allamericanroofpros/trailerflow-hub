import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin, Clock, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
};

export default function PublicOrder() {
  const { slug = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://${projectId}.supabase.co/functions/v1/public-trailer-menu?slug=${encodeURIComponent(slug)}`;
        const r = await fetch(url, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        setData(await r.json());
      } catch (e: any) {
        setData({ error: e.message });
      }
      setLoading(false);
    })();
  }, [slug]);

  const items: MenuItem[] = data?.menuItems ?? [];
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
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const checkout = async () => {
    if (totalQty === 0) return toast.error("Add at least one item");
    if (!name || !email) return toast.error("Name and email required");
    setCheckingOut(true);
    try {
      const payload = {
        slug,
        customer: { name, email, phone },
        items: Object.entries(cart).map(([menu_item_id, quantity]) => ({ menu_item_id, quantity })),
      };
      const { data: res, error } = await supabase.functions.invoke("create-online-order-checkout", {
        body: payload,
      });
      if (error) throw error;
      if (res?.url) window.location.href = res.url;
      else throw new Error("No checkout URL");
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
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

  const { trailer, acceptingOrders, location, note, opens_at, closes_at } = data;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-2xl p-4">
          {trailer.image_url && (
            <img src={trailer.image_url} alt={trailer.name} className="h-32 w-full rounded-lg object-cover mb-3" />
          )}
          <h1 className="text-2xl font-bold">{trailer.name}</h1>
          {trailer.description && (
            <p className="text-sm text-muted-foreground mt-1">{trailer.description}</p>
          )}
          {location && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              <MapPin className="h-4 w-4" /> {location}
            </div>
          )}
          {(opens_at || closes_at) && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {opens_at ?? "?"} – {closes_at ?? "?"}
            </div>
          )}
          {note && (
            <p className="mt-2 rounded bg-muted p-2 text-xs">{note}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 space-y-3">
        {!acceptingOrders ? (
          <Card className="p-6 text-center">
            <p className="font-semibold">Not accepting orders right now</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back during operating hours.
            </p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No items available today.
          </Card>
        ) : (
          <>
            {items.map((m) => {
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

            <Card className="p-4 space-y-3 mt-4">
              <h2 className="font-semibold">Your info</h2>
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
            </Card>
          </>
        )}
      </main>

      {acceptingOrders && totalQty > 0 && (
        <div className="fixed bottom-0 inset-x-0 border-t bg-card p-3">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">{totalQty} item{totalQty > 1 ? "s" : ""}</div>
              <div className="text-lg font-bold">${subtotal.toFixed(2)}</div>
            </div>
            <Button size="lg" onClick={checkout} disabled={checkingOut}>
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingBag className="h-4 w-4 mr-2" />}
              Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
