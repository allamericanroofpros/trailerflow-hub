import { useQuery } from "@tanstack/react-query";
import { claudeNonStreaming } from "./useClaudeAI";
import { supabase } from "@/integrations/supabase/client";

interface ForecastData {
  weeklyForecast: number;
  monthlyForecast: number;
  trend: "up" | "down" | "stable";
  confidence: number;
  insights: string[];
  suggestions: { event: string; date: string; revenue: string; confidence: string }[];
}

export function useAIForecast() {
  return useQuery({
    queryKey: ["ai-forecast"],
    queryFn: async () => {
      // Gather business context
      const [eventsRes, transactionsRes, trailersRes] = await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: false }).limit(20),
        supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).limit(50),
        supabase.from("trailers").select("*"),
      ]);

      const context = `Here is my business data:
Events (recent 20): ${JSON.stringify(eventsRes.data || [])}
Transactions (recent 50): ${JSON.stringify(transactionsRes.data || [])}
Trailers: ${JSON.stringify(trailersRes.data || [])}
Today's date: ${new Date().toISOString().split("T")[0]}`;

      const response = await claudeNonStreaming("forecast", [{ role: "user", content: context }]);

      try {
        // Try to parse JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ForecastData;
        }
      } catch (e) {
        console.error("Failed to parse forecast:", e);
      }

      // Fallback
      return {
        weeklyForecast: 0,
        monthlyForecast: 0,
        trend: "stable" as const,
        confidence: 0,
        insights: ["Unable to generate forecast. Add more event and transaction data."],
        suggestions: [],
      };
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    retry: 1,
  });
}
