import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "./useOrgId";

export type ClockEntry = {
  id: string;
  staff_id: string;
  org_id: string | null;
  event_id: string | null;
  trailer_id: string | null;
  clock_in: string;
  clock_out: string | null;
  hourly_rate: number;
  tips_earned: number;
  notes: string | null;
  created_at: string;
  staff_members?: { id: string; name: string; hourly_rate: number | null };
};

export function useClockEntries(date?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["clock-entries", orgId, date],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("staff_clock_entries" as any)
        .select("*, staff_members(id, name, hourly_rate)")
        .eq("org_id", orgId!)
        .order("clock_in", { ascending: false })
        .limit(200);

      if (date) {
        query = query.gte("clock_in", `${date}T00:00:00`).lte("clock_in", `${date}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ClockEntry[];
    },
    refetchInterval: 30000,
  });
}

export function useActiveClocks() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["clock-entries", "active", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_clock_entries" as any)
        .select("*, staff_members(id, name, hourly_rate)")
        .eq("org_id", orgId!)
        .is("clock_out", null)
        .order("clock_in", { ascending: true });
      if (error) throw error;
      return data as unknown as ClockEntry[];
    },
    refetchInterval: 15000,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      staff_id: string;
      hourly_rate: number;
      event_id?: string;
      trailer_id?: string;
      org_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("staff_clock_entries" as any)
        .insert({
          staff_id: params.staff_id,
          hourly_rate: params.hourly_rate,
          event_id: params.event_id || null,
          trailer_id: params.trailer_id || null,
          org_id: params.org_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clock-entries"] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; tips_earned?: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("staff_clock_entries" as any)
        .update({
          clock_out: new Date().toISOString(),
          tips_earned: params.tips_earned || 0,
          notes: params.notes || null,
        })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clock-entries"] });
    },
  });
}

export function useStaffByPin() {
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (pin: string) => {
      let query = (supabase
        .from("staff_members")
        .select("*") as any)
        .eq("pin", pin)
        .eq("status", "active");
      if (orgId) query = query.eq("org_id", orgId);
      const { data, error } = await query.single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useSetStaffPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, pin }: { staffId: string; pin: string }) => {
      const { data: existing } = await (supabase
        .from("staff_members")
        .select("id") as any)
        .eq("pin", pin)
        .neq("id", staffId);
      if (existing && existing.length > 0) {
        throw new Error("This PIN is already taken. Choose another.");
      }
      const { data, error } = await (supabase
        .from("staff_members")
        .update({ pin } as any)
        .eq("id", staffId)
        .select() as any)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-members"] });
    },
  });
}
