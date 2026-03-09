import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FoundersStatus {
  foundersEnabled: boolean;
  foundersLimit: number;
  foundersCount: number;
  foundersRemaining: number;
  foundersMonthlyPrice: number;
  foundersAnnualPrice: number;
  loading: boolean;
}

export function useFoundersStatus(): FoundersStatus {
  const { data: limits, isLoading: limitsLoading } = useQuery({
    queryKey: ["platform_limits"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_limits")
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const { data: founderCount, isLoading: countLoading } = useQuery({
    queryKey: ["founders_count"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("is_founder", true);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const foundersLimit = limits?.founders_limit ?? 100;
  const currentCount = founderCount ?? 0;

  return {
    foundersEnabled: limits?.founders_enabled ?? true,
    foundersLimit,
    foundersCount: currentCount,
    foundersRemaining: Math.max(0, foundersLimit - currentCount),
    foundersMonthlyPrice: limits?.founders_monthly_price ?? 29,
    foundersAnnualPrice: limits?.founders_annual_price ?? 290,
    loading: limitsLoading || countLoading,
  };
}
