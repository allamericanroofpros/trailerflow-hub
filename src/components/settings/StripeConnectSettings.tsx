import { ExternalLink, RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle, Zap, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStripeConnect, ConnectStatus } from "@/hooks/useStripeConnect";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useOrg } from "@/contexts/OrgContext";
import { getPlatformFeePct, getPlatformFeeLabel } from "@/config/platformFees";
import { toast } from "sonner";

const statusConfig: Record<ConnectStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  not_connected: { label: "Not Connected", color: "bg-muted text-muted-foreground", icon: XCircle },
  pending: { label: "Pending", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  onboarding_started: { label: "Onboarding Started", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  restricted: { label: "Action Required", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  connected: { label: "Connected", color: "bg-success/10 text-success", icon: CheckCircle2 },
};

export function StripeConnectSettings() {
  const { currentOrg } = useOrg();
  const plan = currentOrg?.plan || "free";
  const feePct = getPlatformFeePct(plan);
  const feeLabel = getPlatformFeeLabel(plan);
  const { isOwner } = useRoleAccess();
  const {
    account,
    status,
    isLoading,
    isConnecting,
    isRefreshing,
    isGeneratingLink,
    connectStripe,
    generateOnboardingLink,
    refreshStatus,
  } = useStripeConnect();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment account...
      </div>
    );
  }

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  const hasRequirements =
    account?.stripe_requirements_json?.currently_due?.length ||
    account?.stripe_requirements_json?.past_due?.length;

  const handleConnect = async () => {
    try {
      await connectStripe();
      toast.success("Redirecting to Stripe onboarding...");
    } catch (e: any) {
      toast.error(e.message || "Failed to start Stripe connection");
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      await generateOnboardingLink();
      toast.success("Opening Stripe onboarding...");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate onboarding link");
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshStatus();
      toast.success("Stripe status refreshed");
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh status");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            VendorFlow Payments
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your Stripe account to accept payments and receive payouts.
          </p>
        </div>
        <Badge className={`${cfg.color} shrink-0`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {cfg.label}
        </Badge>
      </div>

      {/* Not connected state */}
      {status === "not_connected" && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-sm font-medium text-card-foreground mb-1">
            Accept payments through VendorFlow
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Connect your Stripe account to process card payments at events and receive payouts directly to your bank account.
          </p>
          {isOwner ? (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting up...</>
              ) : (
                <><ExternalLink className="h-4 w-4 mr-2" /> Connect Stripe</>
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Only the organization owner can connect Stripe.
            </p>
          )}
        </div>
      )}

      {/* Connected / In-progress states */}
      {status !== "not_connected" && account && (
        <div className="space-y-4">
          {/* Status details grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatusDetail
              label="Charges Enabled"
              value={account.stripe_charges_enabled}
            />
            <StatusDetail
              label="Payouts Enabled"
              value={account.stripe_payouts_enabled}
            />
            <StatusDetail
              label="Details Submitted"
              value={account.stripe_details_submitted}
            />
            {account.stripe_connect_email && (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Connected Email
                </p>
                <p className="text-sm font-medium text-card-foreground truncate">
                  {account.stripe_connect_email}
                </p>
              </div>
            )}
          </div>

          {/* Requirements warning */}
          {hasRequirements && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs font-medium text-warning flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Stripe says more information is required
              </p>
              <p className="text-[11px] text-muted-foreground">
                {account.stripe_requirements_json?.past_due?.length
                  ? "Some requirements are past due. Complete them to keep accepting payments."
                  : "Finish onboarding in Stripe to enable full payment capabilities."}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {isOwner && (
            <div className="flex items-center gap-2 flex-wrap">
              {(status === "pending" || status === "onboarding_started" || status === "restricted" || hasRequirements) && (
                <Button
                  size="sm"
                  onClick={handleContinueOnboarding}
                  disabled={isGeneratingLink}
                >
                  {isGeneratingLink ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating link...</>
                  ) : (
                    <><ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {status === "restricted" || hasRequirements ? "Resolve in Stripe" : "Continue Onboarding"}
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Refreshing...</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Status</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusDetail({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`text-sm font-semibold flex items-center gap-1.5 ${value ? "text-success" : "text-muted-foreground"}`}>
        {value ? (
          <><CheckCircle2 className="h-3.5 w-3.5" /> Yes</>
        ) : (
          <><XCircle className="h-3.5 w-3.5" /> No</>
        )}
      </p>
    </div>
  );
}
