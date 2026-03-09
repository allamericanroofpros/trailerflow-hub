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
        supabase.from("events").select("name, event_type, location, actual_revenue, attendance_estimate, event_date, event_end_date").limit(20),
        supabase.from("trailers").select("*").eq("status", "active"),
        supabase.from("profiles").select("business_name").limit(1).single(),
      ]);

      // Build detailed trailer profiles for the AI
      const trailerProfiles = (trailersRes.data || []).map((t: any) => {
        const avgTicket = Number(t.avg_ticket) || 0;
        const custPerHr = Number(t.avg_customers_per_hour) || 0;
        const foodCostPct = Number(t.avg_food_cost_percent) || 30;
        const hourlyCost = Number(t.hourly_cost) || 0;
        const staffReq = Number(t.staff_required) || 1;
        const staffRate = Number(t.staff_hourly_rate) || 15;
        const setupHrs = Number(t.setup_teardown_hours) || 2;
        const fuelCost = Number(t.fuel_cost_per_event) || 0;

        return `TRAILER: ${t.name} (${t.type || "Unknown type"})
  Description: ${t.description || "No description"}
  Specialties: ${t.specialties || "Not specified"}
  Avg Ticket: $${avgTicket.toFixed(1)}
  Customers/Hour: ${custPerHr}
  Food Cost: ${foodCostPct}%
  Operating Cost: $${hourlyCost}/hr
  Staff: ${staffReq} @ $${staffRate}/hr
  Setup/Teardown: ${setupHrs} hrs
  Fuel/Travel: $${fuelCost}/event
  Revenue/hr formula: $${avgTicket} × ${custPerHr} = $${(avgTicket * custPerHr).toFixed(0)}/hr
  Gross profit/hr: $${(avgTicket * custPerHr * (1 - foodCostPct / 100)).toFixed(0)}/hr`;
      }).join("\n\n");

      // Existing commitments for overlap context
      const existingDates = (eventsRes.data || [])
        .filter((e) => e.event_date)
        .map((e) => `${e.name}: ${e.event_date}${e.event_end_date ? ` to ${e.event_end_date}` : ""} at ${e.location || "TBD"}`)
        .join("\n");

      const context = `FOOD TRAILER BUSINESS PROFIT ANALYSIS
Business: ${profileRes.data?.business_name || "Food trailer business"}
Today: ${new Date().toISOString().split("T")[0]}

=== OUR TRAILERS (use these EXACT numbers for profit calculations) ===
${trailerProfiles || "No trailers configured — provide general estimates"}

=== EXISTING SCHEDULE (flag if event dates overlap) ===
${existingDates || "No scheduled events yet"}

=== USER SEARCH ===
"${searchQuery}"

=== INSTRUCTIONS ===
Return a JSON array of EXACTLY 6 real event recommendations. Each object must have:
- name: Real event name
- date: YYYY-MM-DD format
- location: City, State
- type: Event category
- profitEstimate: CALCULATE using our trailer data. Format: "$X,XXX - $Y,YYY net profit". Use this formula:
  * Estimate event hours (typically 4-8hrs)
  * Revenue = avg_ticket × customers_per_hour × event_hours
  * COGS = revenue × food_cost_percent
  * Labor = staff_required × staff_hourly_rate × (event_hours + setup_teardown_hours)
  * Fixed = fuel_cost + operating_cost × event_hours
  * NET PROFIT = Revenue - COGS - Labor - Fixed - vendor_fee (if applicable)
- aiRank: 0-100 score based on profit potential
- attendance: Estimated event attendance
- reasoning: 2-3 sentences explaining WHY this is good for our specific trailer(s), what we'd sell, and the profit math

CRITICAL RULES:
- If location/radius specified, ALL events must be real and within that area
- If date range specified, ALL events must fall within those dates
- Dates must be in the future
- Use REALISTIC customer throughput — busy events may exceed avg, slow ones less
- profitEstimate must show real math, not vague ranges
- Return ONLY the JSON array, no markdown or other text`;

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
