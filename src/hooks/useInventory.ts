import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "./useOrgId";

export function useInventoryItems(trailerId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["inventory-items", orgId, trailerId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select("*")
        .eq("org_id", orgId!)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (trailerId) query = query.eq("trailer_id", trailerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useLowStockItems() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["inventory-items", "low-stock", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("org_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).filter(
        (item) => item.reorder_point && Number(item.current_stock) <= Number(item.reorder_point)
      );
    },
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      name: string;
      unit?: string;
      current_stock?: number;
      par_level?: number;
      reorder_point?: number;
      cost_per_unit?: number;
      supplier?: string;
      trailer_id?: string;
      org_id?: string;
    }) => {
      const { data, error } = await supabase.from("inventory_items").insert(item as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("inventory_items").update(updates as any).eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Update failed — item not found or permission denied");
      return data[0];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      qc.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });
}

export function useCreateInventoryLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: {
      inventory_item_id: string;
      change_amount: number;
      reason: string;
      notes?: string;
      event_id?: string;
      org_id?: string;
    }) => {
      const { data, error } = await supabase.from("inventory_logs").insert(log as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export function useInventoryLogs(itemId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["inventory-logs", orgId, itemId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("inventory_logs")
        .select("*, inventory_items(name, unit)")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (itemId) query = query.eq("inventory_item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
