import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan-based platform fee percentages
const PLATFORM_FEE_PCT: Record<string, number> = {
  free: 1.5,
  starter: 0.5,
  pro: 0,
  enterprise: 0,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { amount, description, metadata, org_id } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const amountCents = Math.round(amount * 100);

    // Look up org plan and connected account
    let connectedAccountId: string | null = null;
    let applicationFeeCents: number | null = null;
    let plan = "free";

    if (org_id) {
      // Get org plan
      const { data: org } = await supabase
        .from("organizations")
        .select("plan")
        .eq("id", org_id)
        .single();
      if (org) plan = org.plan || "free";

      // Get connected account
      const { data: paymentAccount } = await supabase
        .from("organization_payment_accounts")
        .select("stripe_connected_account_id, stripe_charges_enabled")
        .eq("org_id", org_id)
        .eq("is_active", true)
        .maybeSingle();

      if (paymentAccount?.stripe_charges_enabled && paymentAccount.stripe_connected_account_id) {
        connectedAccountId = paymentAccount.stripe_connected_account_id;

        // Calculate platform fee
        const feePct = PLATFORM_FEE_PCT[plan] ?? PLATFORM_FEE_PCT.free;
        if (feePct > 0) {
          applicationFeeCents = Math.round(amountCents * (feePct / 100));
        }
      }
    }

    // Build PaymentIntent params
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: "usd",
      description: description || "POS Sale",
      metadata: {
        ...(metadata || {}),
        ...(org_id ? { org_id } : {}),
        plan,
        ...(applicationFeeCents != null ? { platform_fee_cents: String(applicationFeeCents) } : {}),
      },
      automatic_payment_methods: { enabled: true },
    };

    // Route through connected account if available
    if (connectedAccountId) {
      piParams.transfer_data = { destination: connectedAccountId };
      if (applicationFeeCents && applicationFeeCents > 0) {
        piParams.application_fee_amount = applicationFeeCents;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        connectedAccount: !!connectedAccountId,
        platformFeePct: PLATFORM_FEE_PCT[plan] ?? PLATFORM_FEE_PCT.free,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[CREATE-PAYMENT-INTENT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
