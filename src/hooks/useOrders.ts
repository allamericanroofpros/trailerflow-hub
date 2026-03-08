import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "./useOrgId";

export function useOrders(filters?: { eventId?: string; trailerId?: string }) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["orders", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name, price))")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (filters?.eventId) query = query.eq("event_id", filters.eventId);
      if (filters?.trailerId) query = query.eq("trailer_id", filters.trailerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveOrders() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["orders", "active", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name, price))")
        .eq("org_id", orgId!)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: {
      subtotal: number;
      tax: number;
      tax_label?: string;
      total: number;
      payment_method?: string;
      payment_received?: boolean;
      tip?: number;
      surcharge_amount?: number;
      surcharge_label?: string | null;
      event_id?: string;
      trailer_id?: string;
      notes?: string;
      org_id?: string;
      items: { menu_item_id: string; quantity: number; unit_price: number; modifiers?: any; notes?: string; org_id?: string }[];
    }) => {
      // Defensive check: org_id is required
      if (!order.org_id) {
        throw new Error("Cannot create order: organization context is missing. Please reload and try again.");
      }

      const { items, ...orderData } = order;
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert(orderData as any)
        .select()
        .single();
      if (orderError) throw orderError;

      if (items.length > 0) {
        const orderItems = items.map((item) => ({
          ...item,
          order_id: newOrder.id,
          org_id: order.org_id,
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(orderItems as any);
        if (itemsError) throw itemsError;
      }

      return newOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
