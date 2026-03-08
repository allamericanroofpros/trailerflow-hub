import { useQuery } from "@tanstack/react-query";
import { claudeNonStreaming } from "./useClaudeAI";
import { supabase } from "@/integrations/supabase/client";

interface DiscoveryEvent {
  name: string;
  date: string;
  location: string;
  type: string;
  profitEstimate: string;
  aiRank: number;
  attendance: string;
  reasoning: string;
}

export function useAIDiscovery(searchQuery?: string) {
  return useQuery({
    queryKey: ["ai-discovery", searchQuery],
    queryFn: async () => {
      const [eventsRes, trailersRes, profileRes] = await Promise.all([
        supabase.from("events").select("name, event_type, location, actual_revenue, attendance_estimate").limit(10),
        supabase.from("trailers").select("name, type, menu_items"),
        supabase.from("profiles").select("business_name").limit(1).single(),
      ]);

      const context = `My food trailer business context:
Business: ${profileRes.data?.business_name || "Food trailer business"}
Trailers: ${JSON.stringify(trailersRes.data || [])}
Past events: ${JSON.stringify(eventsRes.data || [])}
Today: ${new Date().toISOString().split("T")[0]}
${searchQuery ? `User search: "${searchQuery}"` : "Find the best upcoming event opportunities in my area."}

Suggest 6 upcoming events that would be profitable for my business. Make them realistic with real-sounding event names, dates in the next 2 months, and realistic California locations.`;

      const response = await claudeNonStreaming("discovery", [{ role: "user", content: context }]);

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as DiscoveryEvent[];
        }
      } catch (e) {
        console.error("Failed to parse discovery:", e);
      }

      return [] as DiscoveryEvent[];
    },
    staleTime: 1000 * 60 * 15, // 15 min cache
    retry: 1,
  });
}
