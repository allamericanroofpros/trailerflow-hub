import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const log = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) return new Response("STRIPE_SECRET_KEY not set", { status: 500 });
  if (!webhookSecret) {
    log("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  let event: Stripe.Event;

  // Verify Stripe signature — always required
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    log("Signature verification failed", { error: msg });
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  log("Event received", { type: event.type, id: event.id });

  const handled = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "account.updated",
    "payment_intent.succeeded",
  ];

  if (!handled.includes(event.type)) {
    log("Unhandled event type, ignoring");
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organization_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        log("Checkout completed", { orgId, customerId, subscriptionId });

        if (orgId && customerId) {
          const updates: Record<string, unknown> = {
            stripe_customer_id: customerId,
          };
          if (subscriptionId) {
            // Fetch full subscription to get price + period
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            updates.stripe_subscription_id = sub.id;
            updates.stripe_price_id = sub.items.data[0]?.price.id ?? null;
            updates.subscription_status = sub.status;
            updates.current_period_end = new Date(sub.current_period_end * 1000).toISOString();
            updates.cancel_at_period_end = sub.cancel_at_period_end;
            updates.plan = session.metadata?.plan_tier || derivePlanFromPrice(sub.items.data[0]?.price.id);
          }

          const { error } = await supabase.from("organizations").update(updates).eq("id", orgId);
          if (error) log("DB update error (checkout)", { error: error.message });
          else log("Organization updated from checkout", { orgId });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(supabase, sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        log("Subscription deleted", { customerId, subId: sub.id });

        if (customerId) {
          const { error } = await supabase
            .from("organizations")
            .update({
              subscription_status: "canceled",
              cancel_at_period_end: false,
              plan: "free",
            })
            .eq("stripe_customer_id", customerId);
          if (error) log("DB update error (delete)", { error: error.message });
          else log("Organization downgraded to free");
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        log("Invoice paid", { customerId, subId });

        if (customerId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(supabase, sub);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        log("Invoice payment failed", { customerId });

        if (customerId) {
          const { error } = await supabase
            .from("organizations")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId);
          if (error) log("DB update error (payment_failed)", { error: error.message });
        }
        break;
      }

      case "account.updated": {
        // Stripe Connect: connected account status changed
        const account = event.data.object as Stripe.Account;
        log("Connected account updated", { accountId: account.id });

        let connectStatus = "pending";
        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          connectStatus = "connected";
        } else if (account.details_submitted) {
          connectStatus = "restricted";
        } else {
          connectStatus = "onboarding_started";
        }

        const requirements = {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          disabled_reason: account.requirements?.disabled_reason || null,
        };

        const connectUpdates: Record<string, unknown> = {
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_payouts_enabled: account.payouts_enabled ?? false,
          stripe_details_submitted: account.details_submitted ?? false,
          stripe_connect_status: connectStatus,
          stripe_requirements_json: requirements,
          stripe_connect_email: account.email || null,
        };

        if (connectStatus === "connected") {
          connectUpdates.stripe_onboarding_completed_at = new Date().toISOString();
        }

        const { error: connectError } = await supabase
          .from("organization_payment_accounts")
          .update(connectUpdates)
          .eq("stripe_connected_account_id", account.id)
          .eq("is_active", true);

        if (connectError) log("DB update error (account.updated)", { error: connectError.message });
        else log("Connected account synced", { accountId: account.id, status: connectStatus });
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orgId = pi.metadata?.org_id;
        const platformFeeCents = pi.metadata?.platform_fee_cents;
        log("PaymentIntent succeeded", {
          id: pi.id,
          amount: pi.amount,
          orgId,
          platformFeeCents,
          connectedAccount: pi.transfer_data?.destination ?? null,
        });
        // Future: record transaction, update order status, etc.
        break;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown";
    log("Processing error", { error: msg, eventType: event.type });
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

// ─── Helpers ───

// deno-lint-ignore no-explicit-any
async function syncSubscription(
  supabase: any,
  sub: Stripe.Subscription
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  const priceId = sub.items.data[0]?.price.id ?? null;
  const updates = {
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    subscription_status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    plan: derivePlanFromPrice(priceId),
  };

  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("stripe_customer_id", customerId);

  if (error) log("syncSubscription DB error", { error: error.message });
  else log("Subscription synced", { customerId, status: sub.status, plan: updates.plan });
}

function derivePlanFromPrice(priceId: string | null): string {
  // Maps Stripe price IDs to plan names — keep in sync with src/config/tiers.ts
  const map: Record<string, string> = {
    // Monthly
    price_1TAH5CCXvW6EawHaUJyQHJIu: "founders",
    price_1TAEtmCXvW6EawHaqDM6Na37: "pro",
    price_1TAEtmCXvW6EawHaPozbgWQC: "enterprise",
    // Annual
    price_1TAH44CXvW6EawHamaG7QXUW: "pro",
    price_1TAH30CXvW6EawHaj30zHdk3: "enterprise",
  };
  return priceId ? map[priceId] ?? "free" : "free";
}
