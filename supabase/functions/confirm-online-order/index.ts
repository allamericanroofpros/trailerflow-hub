import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const url = new URL(req.url);
    const sessionId =
      url.searchParams.get("session_id") ||
      (req.method === "POST" ? (await req.json()).session_id : null);
    if (!sessionId) throw new Error("Missing session_id");

    // Already-created order check
    const { data: existing } = await supabase
      .from("orders")
      .select("id, order_number, status, total")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ order: existing, paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const m = session.metadata || {};
    const items: { menu_item_id: string; quantity: number; notes?: string }[] = JSON.parse(
      m.items_json || "[]"
    );

    const { data: menuRows } = await supabase
      .from("menu_items").select("id, price")
      .in("id", items.map((i) => i.menu_item_id));
    const priceMap = new Map((menuRows ?? []).map((r) => [r.id, Number(r.price)]));

    const subtotal = items.reduce(
      (s, i) => s + (priceMap.get(i.menu_item_id) ?? 0) * i.quantity, 0
    );
    const total = (session.amount_total ?? Math.round(subtotal * 100)) / 100;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        org_id: m.org_id,
        trailer_id: m.trailer_id,
        status: "pending",
        subtotal,
        tax: 0,
        total,
        payment_method: "card",
        payment_received: true,
        source: "online",
        customer_name: m.customer_name || session.customer_details?.name || "",
        customer_email: session.customer_email || session.customer_details?.email || "",
        customer_phone: m.customer_phone || session.customer_details?.phone || "",
        pickup_location: m.pickup_location || "",
        stripe_session_id: sessionId,
      })
      .select("id, order_number")
      .single();
    if (orderErr) throw orderErr;

    const itemRows = items.map((i) => ({
      order_id: order.id,
      org_id: m.org_id,
      menu_item_id: i.menu_item_id,
      quantity: i.quantity,
      unit_price: priceMap.get(i.menu_item_id) ?? 0,
      notes: i.notes ?? null,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsErr) throw itemsErr;

    return new Response(JSON.stringify({ order, paid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[CONFIRM-ONLINE-ORDER]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
