import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "./useOrgId";

export function useMenuItems(trailerId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["menu-items", orgId, trailerId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("menu_items")
        .select("*")
        .eq("org_id", orgId!)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (trailerId) query = query.or(`trailer_id.eq.${trailerId},trailer_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMenuItems() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["menu-items", "all", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*, menu_item_ingredients(*, inventory_items(name, unit, cost_per_unit, serving_unit, serving_unit_conversion))")
        .eq("org_id", orgId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      name: string;
      description?: string;
      category?: string;
      price: number;
      cost?: number;
      image_url?: string;
      modifiers?: any;
      trailer_id?: string;
      org_id?: string;
    }) => {
      const { data, error } = await supabase.from("menu_items").insert(item as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      // Strip any non-column fields that might have leaked in (e.g. nested joins)
      const { menu_item_ingredients, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase.from("menu_items").update(cleanUpdates).eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Update failed — item not found or permission denied");
      return data[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });
}
