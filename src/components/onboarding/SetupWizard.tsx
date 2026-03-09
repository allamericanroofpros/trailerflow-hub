import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Truck, Receipt, UtensilsCrossed, Package, Users, ClipboardList, X, Zap, Sparkles, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  checkKey: string;
}

const STEPS: SetupStep[] = [
  { id: "trailer", title: "Add Your First Trailer", description: "Give it a name and tell us what you serve.", icon: Truck, route: "/trailers", checkKey: "trailers" },
  { id: "menu", title: "Build Your Menu", description: "Add items your customers can order.", icon: UtensilsCrossed, route: "/menu", checkKey: "menu" },
  { id: "tax", title: "Set Up Tax & Fees", description: "Configure sales tax and optional card surcharge.", icon: Receipt, route: "/settings?section=payments", checkKey: "tax" },
  { id: "stripe", title: "Connect Payments", description: "Link Stripe so you can accept card payments.", icon: Zap, route: "/settings?section=payments", checkKey: "stripe" },
  { id: "inventory", title: "Track Your Inventory", description: "Know exactly what you have on hand.", icon: Package, route: "/inventory", checkKey: "inventory" },
  { id: "staff", title: "Add Your Crew", description: "Invite team members and assign roles.", icon: Users, route: "/staff", checkKey: "staff" },
  { id: "bookings", title: "Enable Bookings", description: "Let clients request catering online.", icon: ClipboardList, route: "/settings?section=bookings", checkKey: "bookings" },
];

interface SetupWizardProps {
  completedSteps: Record<string, boolean>;
  onDismiss: () => void;
}

export function SetupWizard({ completedSteps, onDismiss }: SetupWizardProps) {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const completedCount = STEPS.filter((s) => completedSteps[s.checkKey]).length;
  const progress = (completedCount / STEPS.length) * 100;
  const allDone = completedCount === STEPS.length;

  if (allDone) return null;

  // Find first incomplete step
  const nextStep = STEPS.find((s) => !completedSteps[s.checkKey]);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      const { error } = await supabase.functions.invoke("reset-demo-data");
      if (error) throw error;
      toast.success("Demo data loaded! Explore with sample menus, events & orders.");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Could not load demo data");
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Let's get you set up 🚀</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {STEPS.length} steps done — you're making great progress!
          </p>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 touch-manipulation">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Progress value={progress} className="h-1.5 mb-4" />

      {/* Highlighted next step */}
      {nextStep && (
        <button
          onClick={() => navigate(nextStep.route)}
          className="flex items-center gap-3 w-full rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-left mb-3 hover:bg-primary/10 transition-colors touch-manipulation active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
            <nextStep.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-card-foreground">Next: {nextStep.title}</p>
            <p className="text-xs text-muted-foreground">{nextStep.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary shrink-0" />
        </button>
      )}

      {/* Remaining steps */}
      <div className="space-y-1.5">
        {STEPS.filter(s => s.id !== nextStep?.id).map((step) => {
          const done = completedSteps[step.checkKey];
          return (
            <button
              key={step.id}
              onClick={() => navigate(step.route)}
              className={`flex items-center gap-3 w-full rounded-lg border p-3 text-left transition-all touch-manipulation ${
                done
                  ? "border-primary/20 bg-primary/5 opacity-60"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                done ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : <step.icon className="h-3.5 w-3.5" />}
              </div>
              <p className={`text-sm flex-1 ${done ? "text-muted-foreground line-through" : "text-card-foreground font-medium"}`}>
                {step.title}
              </p>
              {!done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Demo data option */}
      {completedCount < 3 && (
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={handleLoadDemo}
            disabled={loadingDemo}
            className="flex items-center gap-2 w-full justify-center rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors touch-manipulation disabled:opacity-50"
          >
            {loadingDemo ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading demo data...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" /> Want to explore first? Load demo data</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
