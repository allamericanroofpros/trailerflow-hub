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
    enabled: !!searchQuery,
    queryFn: async () => {
      const [eventsRes, trailersRes, profileRes] = await Promise.all([
        supabase.from("events").select("name, event_type, location, actual_revenue, attendance_estimate").limit(10),
        supabase.from("trailers").select("name, type, description"),
        supabase.from("profiles").select("business_name").limit(1).single(),
      ]);

      const trailerInfo = (trailersRes.data || []).map((t) =>
        `${t.name} (${t.type}): ${t.description || "No description"}`
      ).join("\n");

      const context = `My food trailer business context:
Business: ${profileRes.data?.business_name || "Food trailer business"}
Our trailers and what they sell:
${trailerInfo || "No trailers configured yet"}
Past events: ${JSON.stringify(eventsRes.data || [])}
Today: ${new Date().toISOString().split("T")[0]}

User search: "${searchQuery}"

You MUST return a JSON array containing EXACTLY 6 REAL event recommendations. Each object must have these fields: name, date, location, type, profitEstimate, aiRank (0-100), attendance, reasoning.

CRITICAL RULES:
- If a location and radius is specified (e.g. "within 50 miles of Vermilion, Ohio"), ALL 6 events MUST be real events that occur within that geographic area.
- Use REAL event names that actually exist or are highly likely to exist in 2026 (county fairs, festivals, farmers markets, community events).
- Dates must be within the next 3 months from today.
- The profitEstimate should consider what our trailers sell (soft serve ice cream and mini pancakes) and estimate realistic revenue for those products at that type of event.
- The reasoning should explain why this event is good specifically for our trailer offerings.
- Return ONLY the JSON array, no other text or markdown.`;

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
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}
