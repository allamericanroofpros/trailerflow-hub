import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useOrgId } from "./useOrgId";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export function useTransactions(filters?: { trailer_id?: string; event_id?: string }) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["transactions", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase.from("transactions").select("*, events(name), trailers(name)").eq("org_id", orgId!).order("transaction_date", { ascending: false });
      if (filters?.trailer_id) query = query.eq("trailer_id", filters.trailer_id);
      if (filters?.event_id) query = query.eq("event_id", filters.event_id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: TransactionInsert) => {
      const { data, error } = await supabase.from("transactions").insert(tx).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}
