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
      return data as ConnectAccount | null;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { org_id: orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
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
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
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
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
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
