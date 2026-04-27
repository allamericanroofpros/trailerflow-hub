import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export type ConnectStatus = "not_connected" | "pending" | "onboarding_started" | "restricted" | "connected";

export interface ConnectAccount {
  id: string;
  org_id: string;
  stripe_connected_account_id: string;
  stripe_connect_status: ConnectStatus;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_onboarding_started_at: string | null;
  stripe_onboarding_completed_at: string | null;
  stripe_requirements_json: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
    disabled_reason?: string | null;
  };
  stripe_connect_email: string | null;
  is_active: boolean;
}

export function useStripeConnect() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const { data: account, isLoading, refetch } = useQuery({
    queryKey: ["stripe_connect", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_payment_accounts" as any)
        .select("*")
        .eq("org_id", orgId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as ConnectAccount | null;
    },
  });

  /** Extract a human-readable message from a Supabase FunctionsHttpError or plain Error. */
  async function extractFnError(error: unknown, data: unknown): Promise<string> {
    // If the function returned { error: "..." } in the body, use that first.
    if (data && typeof data === "object" && "error" in data && typeof (data as any).error === "string") {
      return (data as any).error;
    }
    if (error instanceof Error) {
      // FunctionsHttpError exposes the raw Response on .context
      try {
        const ctx = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) return body.error;
        }
      } catch {/* ignore */}
      return error.message;
    }
    return String(error);
  }

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No org selected — cannot connect Stripe");
      console.log("[useStripeConnect] invoking create-connect-account with org_id:", orgId);
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { org_id: orgId },
      });
      console.log("[useStripeConnect] raw response — data:", JSON.stringify(data), "error:", JSON.stringify(error));
      if (error || data?.error) {
        const msg = await extractFnError(error, data);
        console.error("[useStripeConnect] create-connect-account:", msg, { error, data });
        throw new Error(msg);
      }
      return data as { url: string; account_id: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stripe_connect", orgId] });
      window.open(data.url, "_blank");
    },
  });

  const onboardingLinkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-connect-onboarding-link", {
        body: { org_id: orgId },
      });
      if (error || data?.error) {
        const msg = await extractFnError(error, data);
        console.error("[useStripeConnect] create-connect-onboarding-link:", msg, { error, data });
        throw new Error(msg);
      }
      return data as { url: string };
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("refresh-connect-status", {
        body: { org_id: orgId },
      });
      if (error || data?.error) {
        const msg = await extractFnError(error, data);
        console.error("[useStripeConnect] refresh-connect-status:", msg, { error, data });
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe_connect", orgId] });
    },
  });

  // Auto-refresh when returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "return" && orgId) {
      refreshMutation.mutate();
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("connect");
      window.history.replaceState({}, "", url.toString());
    }
  }, [orgId]);

  const status: ConnectStatus = account
    ? (account.stripe_connect_status as ConnectStatus)
    : "not_connected";

  return {
    account,
    status,
    isLoading,
    isConnecting: connectMutation.isPending,
    isRefreshing: refreshMutation.isPending,
    isGeneratingLink: onboardingLinkMutation.isPending,
    connectStripe: () => connectMutation.mutateAsync(),
    generateOnboardingLink: () => onboardingLinkMutation.mutateAsync(),
    refreshStatus: () => refreshMutation.mutateAsync(),
    refetch,
    connectError: connectMutation.error,
    refreshError: refreshMutation.error,
    linkError: onboardingLinkMutation.error,
  };
}
