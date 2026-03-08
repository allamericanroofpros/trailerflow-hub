import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useOrgId } from "./useOrgId";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
type EventStage = Database["public"]["Enums"]["event_stage"];

export function useEvents(stage?: EventStage, trailerId?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["events", orgId, stage, trailerId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase.from("events").select("*, trailers(name)").eq("org_id", orgId!).order("event_date", { ascending: true });
      if (stage) query = query.eq("stage", stage);
      if (trailerId) query = query.eq("trailer_id", trailerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["events", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, trailers(name), event_checklist_items(*), event_staff(*, staff_members(name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: EventInsert) => {
      const { data, error } = await supabase.from("events").insert(event).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: EventUpdate & { id: string }) => {
      const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useEventsByStage(trailerId?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["events", "by-stage", orgId, trailerId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, trailers(name)")
        .eq("org_id", orgId!)
        .order("event_date", { ascending: true });
      if (trailerId) query = query.eq("trailer_id", trailerId);
      const { data, error } = await query;
      if (error) throw error;

      const stages: EventStage[] = ["lead", "applied", "tentative", "confirmed", "completed", "closed"];
      const grouped: Record<EventStage, typeof data> = {} as any;
      stages.forEach((s) => (grouped[s] = []));
      data?.forEach((e) => grouped[e.stage]?.push(e));
      return grouped;
    },
  });
}
