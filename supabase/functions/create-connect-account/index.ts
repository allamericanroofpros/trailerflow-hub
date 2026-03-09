import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

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

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    // Get request body
    const { org_id } = await req.json();
    if (!org_id) throw new Error("org_id is required");

    // Verify user is org owner
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only organization owners can connect Stripe");
    }
    log("Owner verified", { org_id });

    // Check if there's already an active connected account
    const { data: existing } = await supabase
      .from("organization_payment_accounts")
      .select("*")
      .eq("org_id", org_id)
      .eq("is_active", true)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let accountId: string;

    if (existing?.stripe_connected_account_id) {
      accountId = existing.stripe_connected_account_id;
      log("Using existing connected account", { accountId });
    } else {
      // Get org info for prefill
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", org_id)
        .single();

      // Create a Standard connected account
      const account = await stripe.accounts.create({
        type: "standard",
        email: user.email,
        metadata: {
          vendorflow_org_id: org_id,
          vendorflow_user_id: user.id,
        },
        business_profile: {
          name: org?.name || undefined,
        },
      });
      accountId = account.id;
      log("Created Stripe connected account", { accountId });

      // Store in DB
      await supabase.from("organization_payment_accounts").insert({
        org_id,
        stripe_connected_account_id: accountId,
        stripe_connect_status: "pending",
        stripe_connect_email: user.email,
        stripe_onboarding_started_at: new Date().toISOString(),
      });
    }

    // Generate onboarding link
    const origin = req.headers.get("origin") || "https://vendorflow.app";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?section=payments&connect=refresh`,
      return_url: `${origin}/settings?section=payments&connect=return`,
      type: "account_onboarding",
    });

    log("Onboarding link created", { url: accountLink.url });

    return new Response(
      JSON.stringify({ url: accountLink.url, account_id: accountId }),
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
