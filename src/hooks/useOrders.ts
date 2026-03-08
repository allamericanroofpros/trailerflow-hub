import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrders(filters?: { eventId?: string; trailerId?: string }) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name, price))")
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
  return useQuery({
    queryKey: ["orders", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name, price))")
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Auto-refresh every 5s
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: {
      subtotal: number;
      tax: number;
      total: number;
      payment_method?: string;
      payment_received?: boolean;
      tip?: number;
      event_id?: string;
      trailer_id?: string;
      notes?: string;
      items: { menu_item_id: string; quantity: number; unit_price: number; modifiers?: any; notes?: string }[];
    }) => {
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
