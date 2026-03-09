import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Truck, Receipt, UtensilsCrossed, Package, Users, ClipboardList, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  checkKey: string;
}

const STEPS: SetupStep[] = [
  { id: "trailer", title: "Add Your First Trailer", description: "Set up a trailer with its name, type, and details.", icon: Truck, route: "/trailers", checkKey: "trailers" },
  { id: "tax", title: "Configure Tax & Surcharge", description: "Set your sales tax rate and optional card fee pass-through.", icon: Receipt, route: "/settings?section=payments", checkKey: "tax" },
  { id: "menu", title: "Build Your Menu", description: "Add menu items with prices and categories.", icon: UtensilsCrossed, route: "/menu", checkKey: "menu" },
  { id: "inventory", title: "Set Up Inventory", description: "Track ingredients and supplies with par levels.", icon: Package, route: "/inventory", checkKey: "inventory" },
  { id: "staff", title: "Add Team Members", description: "Invite your crew and assign roles.", icon: Users, route: "/staff", checkKey: "staff" },
  { id: "bookings", title: "Configure Bookings", description: "Set up your public booking page for catering inquiries.", icon: ClipboardList, route: "/bookings", checkKey: "bookings" },
];

interface SetupWizardProps {
  completedSteps: Record<string, boolean>;
  onDismiss: () => void;
}

export function SetupWizard({ completedSteps, onDismiss }: SetupWizardProps) {
  const navigate = useNavigate();
  const completedCount = STEPS.filter((s) => completedSteps[s.checkKey]).length;
  const progress = (completedCount / STEPS.length) * 100;
  const allDone = completedCount === STEPS.length;

  if (allDone) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Get Started with VendorFlow</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {STEPS.length} steps complete
          </p>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Progress value={progress} className="h-1.5 mb-4" />

      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = completedSteps[step.checkKey];
          return (
            <button
              key={step.id}
              onClick={() => navigate(step.route)}
              className={`flex items-center gap-3 w-full rounded-lg border p-3 text-left transition-all ${
                done
                  ? "border-primary/20 bg-primary/5 opacity-70"
                  : "border-border bg-background hover:border-primary/40 hover:bg-accent/50"
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                done ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {done ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
              {!done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
