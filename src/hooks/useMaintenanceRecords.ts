import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MaintenanceRecord = Database["public"]["Tables"]["maintenance_records"]["Row"];
type MaintenanceInsert = Database["public"]["Tables"]["maintenance_records"]["Insert"];
type MaintenanceUpdate = Database["public"]["Tables"]["maintenance_records"]["Update"];

export function useMaintenanceRecords(trailerId?: string) {
  return useQuery({
    queryKey: ["maintenance_records", trailerId],
    queryFn: async () => {
      let query = supabase.from("maintenance_records").select("*, trailers(name)").order("due_date", { ascending: true });
      if (trailerId) query = query.eq("trailer_id", trailerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMaintenanceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: MaintenanceInsert) => {
      const { data, error } = await supabase.from("maintenance_records").insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_records"] }),
  });
}

export function useUpdateMaintenanceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: MaintenanceUpdate & { id: string }) => {
      const { data, error } = await supabase.from("maintenance_records").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance_records"] }),
  });
}
