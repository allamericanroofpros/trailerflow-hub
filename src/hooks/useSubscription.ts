import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgId } from "@/hooks/useOrgId";
import { getTierByProductId, TierKey } from "@/config/tiers";

interface SubscriptionState {
  subscribed: boolean;
  tier: TierKey | null;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
}

export function useSubscription() {
  const { session } = useAuth();
  const orgId = useOrgId();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    tier: null,
    subscriptionEnd: null,
    cancelAtPeriodEnd: false,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setState({ subscribed: false, tier: null, subscriptionEnd: null, cancelAtPeriodEnd: false, loading: false });
      return;
    }

    // 1. Try reading from the organization record first (authoritative)
    if (orgId) {
      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_status, current_period_end, cancel_at_period_end, stripe_price_id, plan")
        .eq("id", orgId)
        .single();

      if (org && org.subscription_status && org.subscription_status !== "inactive") {
        const isActive = ["active", "trialing"].includes(org.subscription_status);
        const planVal = org.plan || "pro";
        const tier = (planVal !== "free" ? planVal : null) as TierKey | null;
        setState({
          subscribed: isActive,
          tier,
          subscriptionEnd: org.current_period_end ?? null,
          cancelAtPeriodEnd: org.cancel_at_period_end ?? false,
          loading: false,
        });
        return;
      }
    }

    // 2. Fallback: edge function (for orgs not yet synced via webhook)
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      const tier = data?.product_id ? getTierByProductId(data.product_id) : null;
      setState({
        subscribed: data?.subscribed ?? false,
        tier,
        subscriptionEnd: data?.subscription_end ?? null,
        cancelAtPeriodEnd: false,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to check subscription:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [session, orgId]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const startCheckout = async (priceId: string) => {
    // Derive plan tier from price ID
    const tierMap: Record<string, string> = {
      price_1T8ntxEHIsr46VcJ3J4mPMEq: "starter",
      price_1T8nuWEHIsr46VcJxMizsKl7: "pro",
      price_1T8nugEHIsr46VcJ6ugiRGFR: "enterprise",
    };
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        price_id: priceId,
        organization_id: orgId || "",
        plan_tier: tierMap[priceId] || "",
      },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  const openPortal = async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  return { ...state, checkSubscription, startCheckout, openPortal };
}
