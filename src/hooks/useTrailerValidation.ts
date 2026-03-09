import { useState, useCallback } from "react";
import { claudeNonStreaming } from "./useClaudeAI";

interface ValidationItem {
  field: string;
  status: "good" | "warning" | "concern";
  message: string;
}

interface ValidationResult {
  overall: "good" | "warning" | "concern";
  score: number;
  items: ValidationItem[];
}

export function useTrailerValidation() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (trailerData: {
    name: string;
    type: string;
    specialties: string;
    avg_ticket: string;
    avg_customers_per_hour: string;
    avg_food_cost_percent: string;
    staff_required: string;
    staff_hourly_rate: string;
    setup_teardown_hours: string;
    fuel_cost_per_event: string;
    hourly_cost: string;
  }) => {
    setIsValidating(true);
    setResult(null);
    try {
      const ticket = Number(trailerData.avg_ticket) || 0;
      const custPerHr = Number(trailerData.avg_customers_per_hour) || 0;
      const revenuePerHr = ticket * custPerHr;
      const foodCostPct = Number(trailerData.avg_food_cost_percent) || 30;
      const profitPerHr = revenuePerHr * (1 - foodCostPct / 100);

      const prompt = `Validate this food trailer's cost/revenue data:

TRAILER: ${trailerData.name || "Unnamed"}
Type: ${trailerData.type || "Not specified"}
Specialties: ${trailerData.specialties || "Not specified"}

NUMBERS TO VALIDATE:
- Average Ticket: $${ticket.toFixed(1)}
- Customers/Hour: ${custPerHr}
- Revenue/Hour (calculated): $${revenuePerHr.toFixed(0)}
- Food Cost %: ${foodCostPct}%
- Gross Profit/Hour (calculated): $${profitPerHr.toFixed(0)}
- Staff Required: ${trailerData.staff_required || "1"}
- Staff Hourly Rate: $${trailerData.staff_hourly_rate || "15"}
- Setup/Teardown Hours: ${trailerData.setup_teardown_hours || "2"}
- Fuel/Travel Cost per Event: $${trailerData.fuel_cost_per_event || "0"}
- Operating Cost/Hour: $${trailerData.hourly_cost || "0"}

Please validate each number against industry benchmarks for this type of trailer and return your assessment.`;

      const response = await claudeNonStreaming("validate-trailer", [
        { role: "user", content: prompt },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ValidationResult;
        setResult(parsed);
      }
    } catch (e) {
      console.error("Validation failed:", e);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clear = useCallback(() => setResult(null), []);

  return { result, isValidating, validate, clear };
}
