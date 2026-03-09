import { Sparkles, ArrowRight, Crown, Flame } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useFoundersStatus } from "@/hooks/useFoundersStatus";

interface UpsellSuggestion {
  targetPlan: string;
  planName: string;
  price: string;
  headline: string;
  perks: string[];
  icon: React.ReactNode;
}

export function UpsellCard() {
  const { foundersEnabled, foundersRemaining, foundersMonthlyPrice } = useFoundersStatus();

  // During beta, only upsell from pro to enterprise
  const suggestion: UpsellSuggestion = {
    targetPlan: "enterprise",
    planName: "Enterprise",
    price: "$199/mo",
    headline: "Scale with Enterprise",
    perks: ["Multi-org management", "Custom integrations & API", "White-label receipts"],
    icon: <Crown className="h-4 w-4" />,
  };

  // If founders is available, show founders promo instead
  if (foundersEnabled && foundersRemaining > 0) {
    return (
      <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-4 space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-foreground">Founders Pricing Available</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Enterprise features at ${foundersMonthlyPrice}/mo — locked for life. {foundersRemaining} spots remaining.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {suggestion.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{suggestion.headline}</span>
            <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              {suggestion.price}
            </span>
          </div>
          <ul className="space-y-0.5">
            {suggestion.perks.map((perk) => (
              <li key={perk} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-primary/60 shrink-0" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
