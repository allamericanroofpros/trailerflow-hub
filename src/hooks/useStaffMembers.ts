import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type StaffMember = Database["public"]["Tables"]["staff_members"]["Row"];
type StaffInsert = Database["public"]["Tables"]["staff_members"]["Insert"];
type StaffUpdate = Database["public"]["Tables"]["staff_members"]["Update"];

export function useStaffMembers() {
  return useQuery({
    queryKey: ["staff_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_members").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateStaffMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staff: StaffInsert) => {
      const { data, error } = await supabase.from("staff_members").insert(staff).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_members"] }),
  });
}

export function useUpdateStaffMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: StaffUpdate & { id: string }) => {
      const { data, error } = await supabase.from("staff_members").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_members"] }),
  });
}

export function useDeleteStaffMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_members"] }),
  });
}
