import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[REFRESH-CONNECT-STATUS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

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

    // Verify org membership (any member can refresh status)
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", userData.user.id)
      .single();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Get existing account
    const { data: paymentAccount } = await supabase
      .from("organization_payment_accounts")
      .select("*")
      .eq("org_id", org_id)
      .eq("is_active", true)
      .single();

    if (!paymentAccount?.stripe_connected_account_id) {
      return new Response(
        JSON.stringify({ connected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Use basil preview API to access v2 endpoints
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });

    const account = await (stripe as any).v2.core.accounts.retrieve(
      paymentAccount.stripe_connected_account_id,
      { include: ["configuration.merchant", "requirements"] }
    );

    const cardPaymentsStatus = account?.configuration?.merchant?.capabilities?.card_payments?.status;
    const isReady = cardPaymentsStatus === "active";
    const isPending = cardPaymentsStatus === "pending";
    const requirements = account?.requirements || {};
    const hasOpenRequirements =
      (requirements?.currently_due?.length || 0) > 0 ||
      (requirements?.past_due?.length || 0) > 0;

    log("V2 account retrieved", {
      accountId: account.id,
      cardPaymentsStatus,
      isReady,
      hasOpenRequirements,
    });

    // Derive connect status from V2 fields
    let connectStatus: string;
    if (isReady) {
      connectStatus = "connected";
    } else if (hasOpenRequirements) {
      connectStatus = "restricted";
    } else if (isPending || paymentAccount.stripe_onboarding_started_at) {
      connectStatus = "onboarding_started";
    } else {
      connectStatus = "pending";
    }

    const updates: Record<string, unknown> = {
      stripe_charges_enabled: isReady,
      stripe_payouts_enabled: isReady,
      stripe_details_submitted: isReady || hasOpenRequirements,
      stripe_connect_status: connectStatus,
      stripe_requirements_json: {
        currently_due: requirements?.currently_due || [],
        eventually_due: requirements?.eventually_due || [],
        past_due: requirements?.past_due || [],
        disabled_reason: requirements?.disabled_reason || null,
      },
      stripe_connect_email: account.contact_email || paymentAccount.stripe_connect_email,
    };

    if (connectStatus === "connected" && !paymentAccount.stripe_onboarding_completed_at) {
      updates.stripe_onboarding_completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("organization_payment_accounts")
      .update(updates)
      .eq("id", paymentAccount.id);

    if (updateError) {
      log("DB update error", { error: updateError.message });
      throw new Error("Failed to update payment account status");
    }

    log("Status refreshed", { connectStatus, cardPaymentsStatus });

    return new Response(
      JSON.stringify({
        connected: true,
        status: connectStatus,
        charges_enabled: isReady,
        payouts_enabled: isReady,
        details_submitted: isReady || hasOpenRequirements,
        requirements,
      }),
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
