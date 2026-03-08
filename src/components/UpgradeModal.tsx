import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLAN_ENTITLEMENTS, type PlanKey } from "@/config/entitlements";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  currentPlan: PlanKey;
  requiredPlan: PlanKey;
}

export function UpgradeModal({ open, onOpenChange, feature, currentPlan, requiredPlan }: UpgradeModalProps) {
  const navigate = useNavigate();
  const current = PLAN_ENTITLEMENTS[currentPlan] ?? PLAN_ENTITLEMENTS.free;
  const required = PLAN_ENTITLEMENTS[requiredPlan] ?? PLAN_ENTITLEMENTS.pro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-lg">Upgrade to unlock {feature}</DialogTitle>
          <DialogDescription className="text-sm">
            This feature requires the <span className="font-semibold text-foreground">{required.label}</span> plan.
            You're currently on the <span className="font-semibold text-foreground">{current.label}</span> plan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{required.label} Plan includes:</span>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {requiredPlan === "pro" && (
              <>
                <li>✓ Unlimited trailers & staff</li>
                <li>✓ AI event discovery</li>
                <li>✓ AI revenue forecasting</li>
                <li>✓ Fleet overview & analytics</li>
                <li>✓ Priority support</li>
              </>
            )}
            {requiredPlan === "enterprise" && (
              <>
                <li>✓ Everything in Pro</li>
                <li>✓ Multi-org management</li>
                <li>✓ Custom integrations & API</li>
                <li>✓ White-label receipts</li>
                <li>✓ Dedicated support</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/settings?section=billing");
            }}
            className="gap-2 flex-1"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade Now
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline upgrade banner for embedding in pages
 */
export function UpgradeBanner({ feature, currentPlan, requiredPlan }: { feature: string; currentPlan: PlanKey; requiredPlan: PlanKey }) {
  const navigate = useNavigate();
  const required = PLAN_ENTITLEMENTS[requiredPlan] ?? PLAN_ENTITLEMENTS.pro;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{feature}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        This feature is available on the <span className="font-semibold text-foreground">{required.label}</span> plan and above.
        Upgrade to unlock it.
      </p>
      <Button
        onClick={() => navigate("/settings?section=billing")}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Upgrade to {required.label}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
