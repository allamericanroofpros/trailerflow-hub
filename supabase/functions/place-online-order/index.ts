// Stub endpoint: places an online pickup order without payment processing.
// Square online checkout will plug in here once the integration is connected.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const {
      slug,
      items,
      customer,
      pickup_at,
      notes,
    } = body as {
      slug: string;
      items: { menu_item_id: string; quantity: number; notes?: string; modifiers?: unknown }[];
      customer: { name: string; email: string; phone?: string };
      pickup_at?: string | null;
      notes?: string;
    };

    if (!slug || !Array.isArray(items) || items.length === 0) throw new Error("Invalid request");
    if (!customer?.name || !customer?.email) throw new Error("Customer name and email required");

    const { data: trailer } = await supabase
      .from("trailers")
      .select("id, org_id, online_ordering_enabled, online_ordering_force_closed")
      .eq("slug", slug)
      .maybeSingle();
    if (!trailer) throw new Error("Trailer not found");
    if (!trailer.online_ordering_enabled || trailer.online_ordering_force_closed)
      throw new Error("Ordering not available");

    const today = new Date().toISOString().slice(0, 10);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, location")
      .eq("trailer_id", trailer.id)
      .eq("event_date", today)
      .in("status", ["confirmed", "pending"])
      .order("start_time", { ascending: true });
    const booking = bookings?.[0];
    if (!booking?.location) throw new Error("Trailer is not scheduled today");

    // Look up authoritative prices
    const { data: menuRows } = await supabase
      .from("menu_items")
      .select("id, price, org_id, trailer_id, is_active")
      .in("id", items.map((i) => i.menu_item_id));

    const valid = new Map((menuRows ?? [])
      .filter((m) => m.is_active && m.org_id === trailer.org_id && (m.trailer_id === trailer.id || m.trailer_id === null))
      .map((m) => [m.id, Number(m.price)]));

    const bad = items.find((i) => !valid.has(i.menu_item_id));
    if (bad) throw new Error("One or more items unavailable");

    const subtotal = items.reduce((s, i) => s + (valid.get(i.menu_item_id) ?? 0) * i.quantity, 0);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        org_id: trailer.org_id,
        trailer_id: trailer.id,
        booking_id: booking.id,
        status: "pending",
        subtotal,
        tax: 0,
        total: subtotal,
        payment_method: null,
        payment_received: false,
        source: "online",
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone ?? null,
        pickup_location: booking.location,
        pickup_at: pickup_at ?? null,
        notes: notes ?? null,
      })
      .select("id, order_number")
      .single();
    if (orderErr) throw orderErr;

    const itemRows = items.map((i) => ({
      order_id: order.id,
      org_id: trailer.org_id,
      menu_item_id: i.menu_item_id,
      quantity: i.quantity,
      unit_price: valid.get(i.menu_item_id) ?? 0,
      modifiers: (i.modifiers as any) ?? [],
      notes: i.notes ?? null,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsErr) throw itemsErr;

    // PAYMENT SEAM:
    // Future Square Online Checkout handoff goes here. Build a Square Checkout
    // link tied to order.id and return it as `payment_url`. Until then, return
    // a pay-at-pickup confirmation.
    return new Response(
      JSON.stringify({
        order,
        payment_url: null,
        payment_status: "pay_at_pickup",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[PLACE-ONLINE-ORDER]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
