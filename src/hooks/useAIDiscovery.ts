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
${searchQuery ? `User search: "${searchQuery}"` : "Find the best upcoming event opportunities near me."}

You MUST return a JSON array containing EXACTLY 6 event recommendations. Each object must have these fields: name, date, location, type, profitEstimate, aiRank (0-100), attendance, reasoning.

Important: Return diverse locations relevant to the search. If a location or radius is specified, ALL 6 events must be within that area. Use realistic event names, dates within the next 2 months, and realistic US locations. Return ONLY the JSON array, no other text.`;

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
