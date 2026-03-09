import { CheckCircle2, AlertTriangle, XCircle, Zap, ArrowRight } from "lucide-react";
import { useStripeConnect, ConnectStatus } from "@/hooks/useStripeConnect";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<ConnectStatus, { label: string; color: string; icon: typeof CheckCircle2; message: string }> = {
  not_connected: { label: "Not Set Up", color: "bg-muted text-muted-foreground", icon: XCircle, message: "Connect Stripe to accept card payments at events." },
  pending: { label: "Pending", color: "bg-warning/10 text-warning", icon: AlertTriangle, message: "Finish setting up your Stripe account to start accepting payments." },
  onboarding_started: { label: "In Progress", color: "bg-warning/10 text-warning", icon: AlertTriangle, message: "Complete your Stripe onboarding to enable payouts." },
  restricted: { label: "Action Required", color: "bg-destructive/10 text-destructive", icon: AlertTriangle, message: "Stripe needs more info before you can accept payments." },
  connected: { label: "Ready", color: "bg-success/10 text-success", icon: CheckCircle2, message: "You're all set to accept card payments!" },
};

/** Compact Stripe Connect status chip for the dashboard */
export function StripeStatusChip() {
  const navigate = useNavigate();
  const { status, isLoading } = useStripeConnect();

  if (isLoading || status === "connected") return null;

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <button
      onClick={() => navigate("/settings?section=payments")}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card text-left w-full hover:shadow-card-hover transition-shadow"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
        <Zap className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-card-foreground">Payments</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{cfg.message}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
