import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Trailer = Database["public"]["Tables"]["trailers"]["Row"];
type TrailerInsert = Database["public"]["Tables"]["trailers"]["Insert"];
type TrailerUpdate = Database["public"]["Tables"]["trailers"]["Update"];

export function useTrailers() {
  return useQuery({
    queryKey: ["trailers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trailers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useTrailer(id: string | undefined) {
  return useQuery({
    queryKey: ["trailers", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("trailers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTrailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trailer: TrailerInsert) => {
      const { data, error } = await supabase.from("trailers").insert(trailer).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trailers"] }),
  });
}

export function useUpdateTrailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TrailerUpdate & { id: string }) => {
      const { data, error } = await supabase.from("trailers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trailers"] }),
  });
}

export function useDeleteTrailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trailers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trailers"] }),
  });
}
