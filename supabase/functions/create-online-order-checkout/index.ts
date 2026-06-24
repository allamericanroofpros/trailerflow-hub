import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_PCT: Record<string, number> = {
  free: 1.5,
  starter: 0.5,
  pro: 0,
  enterprise: 0,
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

    const body = await req.json();
    const { slug, items, customer } = body as {
      slug: string;
      items: { menu_item_id: string; quantity: number; notes?: string }[];
      customer: { name: string; email: string; phone?: string };
    };

    if (!slug || !Array.isArray(items) || items.length === 0) throw new Error("Invalid request");
    if (!customer?.email || !customer?.name) throw new Error("Customer info required");

    const { data: trailer } = await supabase
      .from("trailers")
      .select("id, name, org_id, online_ordering_enabled")
      .eq("slug", slug)
      .maybeSingle();
    if (!trailer || !trailer.online_ordering_enabled) throw new Error("Ordering not available");

    const today = new Date().toISOString().slice(0, 10);
    const { data: setup } = await supabase
      .from("trailer_daily_setup")
      .select("ordering_enabled, available_menu_item_ids, location")
      .eq("trailer_id", trailer.id)
      .eq("setup_date", today)
      .maybeSingle();
    if (!setup?.ordering_enabled) throw new Error("Trailer not accepting orders today");

    const allowedIds = new Set(setup.available_menu_item_ids ?? []);
    const invalid = items.find((i) => !allowedIds.has(i.menu_item_id));
    if (invalid) throw new Error("Item unavailable");

    const { data: menuRows } = await supabase
      .from("menu_items")
      .select("id, name, price")
      .in("id", items.map((i) => i.menu_item_id));
    const priceMap = new Map((menuRows ?? []).map((m) => [m.id, m]));

    const lineItems = items.map((i) => {
      const m = priceMap.get(i.menu_item_id);
      if (!m) throw new Error("Item not found");
      return {
        price_data: {
          currency: "usd",
          product_data: { name: m.name },
          unit_amount: Math.round(Number(m.price) * 100),
        },
        quantity: i.quantity,
      };
    });

    const subtotalCents = lineItems.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0);

    // org plan + connect
    const { data: org } = await supabase
      .from("organizations").select("plan").eq("id", trailer.org_id).single();
    const plan = org?.plan || "free";

    const { data: pa } = await supabase
      .from("organization_payment_accounts")
      .select("stripe_connected_account_id, stripe_charges_enabled")
      .eq("org_id", trailer.org_id)
      .eq("is_active", true)
      .maybeSingle();

    const connectedAccountId =
      pa?.stripe_charges_enabled ? pa.stripe_connected_account_id : null;
    if (!connectedAccountId) throw new Error("This vendor is not set up to accept online payments");

    const feePct = PLATFORM_FEE_PCT[plan] ?? PLATFORM_FEE_PCT.free;
    const applicationFeeCents = feePct > 0 ? Math.round(subtotalCents * (feePct / 100)) : 0;

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customer.email,
      success_url: `${origin}/order/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order/${slug}`,
      payment_intent_data: {
        ...(applicationFeeCents > 0 ? { application_fee_amount: applicationFeeCents } : {}),
        transfer_data: { destination: connectedAccountId },
        metadata: {
          source: "online_order",
          org_id: trailer.org_id,
          trailer_id: trailer.id,
        },
      },
      metadata: {
        source: "online_order",
        org_id: trailer.org_id,
        trailer_id: trailer.id,
        customer_name: customer.name,
        customer_phone: customer.phone ?? "",
        pickup_location: setup.location ?? "",
        items_json: JSON.stringify(items),
      },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[CREATE-ONLINE-ORDER-CHECKOUT]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
