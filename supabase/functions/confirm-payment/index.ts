import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { paymentIntentId, tipAmount } = await req.json();

    if (!paymentIntentId) throw new Error("Missing paymentIntentId");

    // If there's a tip, update the payment intent amount
    if (tipAmount && tipAmount > 0) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      const newAmount = pi.amount + Math.round(tipAmount * 100);
      await stripe.paymentIntents.update(paymentIntentId, {
        amount: newAmount,
        metadata: { ...pi.metadata, tip_amount: tipAmount.toString() },
      });
    }

    // Retrieve current status
    let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // For Terminal payments with manual capture, capture the payment
    if (paymentIntent.status === "requires_capture") {
      paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    }

    return new Response(
      JSON.stringify({
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        id: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[CONFIRM-PAYMENT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
