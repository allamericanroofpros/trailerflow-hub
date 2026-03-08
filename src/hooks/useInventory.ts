import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInventoryItems(trailerId?: string) {
  return useQuery({
    queryKey: ["inventory-items", trailerId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select("*")
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
  return useQuery({
    queryKey: ["inventory-items", "low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      // Filter client-side: current_stock <= reorder_point
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
      const { data, error } = await supabase.from("inventory_items").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
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
    }) => {
      const { data, error } = await supabase.from("inventory_logs").insert(log as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export function useInventoryLogs(itemId?: string) {
  return useQuery({
    queryKey: ["inventory-logs", itemId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_logs")
        .select("*, inventory_items(name, unit)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (itemId) query = query.eq("inventory_item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
