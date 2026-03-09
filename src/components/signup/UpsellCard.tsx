import { Sparkles, ArrowRight, Zap, Crown } from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface UpsellSuggestion {
  targetPlan: string;
  planName: string;
  price: string;
  headline: string;
  perks: string[];
  icon: React.ReactNode;
}

const UPSELL_MAP: Record<string, UpsellSuggestion | null> = {
  free: {
    targetPlan: "starter",
    planName: "Starter",
    price: "$29/mo",
    headline: "Unlock more with Starter",
    perks: ["AI-powered chat assistant", "Up to 5 staff accounts", "30-day free trial"],
    icon: <Zap className="h-4 w-4" />,
  },
  starter: {
    targetPlan: "pro",
    planName: "Pro",
    price: "$79/mo",
    headline: "Go Pro for unlimited power",
    perks: ["Unlimited trailers & staff", "AI forecasting & discovery", "Advanced analytics"],
    icon: <Sparkles className="h-4 w-4" />,
  },
  pro: {
    targetPlan: "enterprise",
    planName: "Enterprise",
    price: "$199/mo",
    headline: "Scale with Enterprise",
    perks: ["Multi-org management", "Custom integrations & API", "White-label receipts"],
    icon: <Crown className="h-4 w-4" />,
  },
  enterprise: null,
};

/** Contextual nudges shown based on step + user inputs */
const CONTEXTUAL_NUDGES: Record<number, Record<string, string>> = {
  2: {
    free: "Managing a team? Starter includes 5 staff accounts + AI chat.",
    starter: "Multiple trailers? Pro gives you unlimited trailers & fleet tracking.",
  },
  3: {
    free: "Need AI insights? Upgrade to Starter for an AI-powered assistant.",
    starter: "Want forecasting & analytics? Pro unlocks the full AI suite.",
    pro: "Running multiple brands? Enterprise adds multi-org management.",
  },
};

interface UpsellCardProps {
  step: number;
  trailerCount: string;
  teamSize: string;
}

export function UpsellCard({ step, trailerCount, teamSize }: UpsellCardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPlan = searchParams.get("plan") || "free";
  const suggestion = UPSELL_MAP[currentPlan];

  if (!suggestion) return null;

  // Smart nudge: if user picks >1 trailer on free/starter, push harder
  const multiTrailer = parseInt(trailerCount) > 1 || trailerCount === "5+";
  const bigTeam = ["4-7", "8-15", "16+"].includes(teamSize);

  let nudgeText = CONTEXTUAL_NUDGES[step]?.[currentPlan] || null;

  // Override with smarter contextual nudge on step 2
  if (step === 2) {
    if (multiTrailer && (currentPlan === "free" || currentPlan === "starter")) {
      nudgeText = `You selected ${trailerCount} trailers — ${currentPlan === "free" ? "Starter" : "Pro"} supports ${currentPlan === "free" ? "1 trailer. Upgrade to Pro for unlimited." : "unlimited trailers with fleet tracking."}`;
    } else if (bigTeam && currentPlan === "free") {
      nudgeText = `Team of ${teamSize}? Free only supports 2 staff. Starter gives you 5, or go Pro for unlimited.`;
    }
  }

  const handleUpgrade = () => {
    setSearchParams({ plan: suggestion.targetPlan });
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
      {nudgeText && (
        <p className="text-xs font-medium text-primary/80">{nudgeText}</p>
      )}
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
      <button
        type="button"
        onClick={handleUpgrade}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        Switch to {suggestion.planName}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
