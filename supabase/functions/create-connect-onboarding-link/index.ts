import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-CONNECT-ONBOARDING-LINK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { org_id } = await req.json();
    if (!org_id) throw new Error("org_id is required");

    // Verify owner
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", userData.user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only organization owners can manage Stripe connection");
    }

    // Get existing account
    const { data: paymentAccount } = await supabase
      .from("organization_payment_accounts")
      .select("stripe_connected_account_id")
      .eq("org_id", org_id)
      .eq("is_active", true)
      .single();

    if (!paymentAccount?.stripe_connected_account_id) {
      throw new Error("No connected Stripe account found. Please connect first.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://vendorflow.app";

    const accountLink = await stripe.accountLinks.create({
      account: paymentAccount.stripe_connected_account_id,
      refresh_url: `${origin}/settings?section=payments&connect=refresh`,
      return_url: `${origin}/settings?section=payments&connect=return`,
      type: "account_onboarding",
    });

    log("Onboarding link created", { accountId: paymentAccount.stripe_connected_account_id });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
