import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Inline placeholder shown instead of an advanced analytics widget
 * when the user's plan doesn't include advancedAnalytics.
 */
export function AdvancedAnalyticsPlaceholder({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card relative overflow-hidden">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">{title}</h3>
      <div className="flex flex-col items-center justify-center h-[220px] text-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground max-w-[200px]">
          Upgrade to <span className="font-semibold text-foreground">Pro</span> to unlock advanced analytics.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 mt-1"
          onClick={() => navigate("/settings?section=billing")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
