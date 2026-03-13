import { useNavigate } from "react-router-dom";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Truck, UtensilsCrossed, Receipt, Package,
  Users, CalendarCheck, CreditCard,
} from "lucide-react";

type StepKey = "trailers" | "menu" | "tax" | "inventory" | "staff" | "bookings" | "stripe";

interface SetupGateProps {
  requires: StepKey;
  href: string;
  label: string;
  children: React.ReactNode;
}

const META: Record<StepKey, { icon: React.ElementType; text: string }> = {
  trailers:  { icon: Truck,           text: "Add your first trailer to get started." },
  menu:      { icon: UtensilsCrossed, text: "Build your menu before using the POS or taking orders." },
  tax:       { icon: Receipt,         text: "Set up your tax or surcharge settings first." },
  inventory: { icon: Package,         text: "Add inventory items to start tracking stock." },
  staff:     { icon: Users,           text: "Add at least one staff member to use this feature." },
  bookings:  { icon: CalendarCheck,   text: "Enable bookings in Settings to use this page." },
  stripe:    { icon: CreditCard,      text: "Connect Stripe in Settings to accept card payments." },
};

export function SetupGate({ requires, href, label, children }: SetupGateProps) {
  const navigate = useNavigate();
  const { completedSteps } = useOnboardingStatus();

  if (completedSteps[requires]) return <>{children}</>;

  const { icon: Icon, text } = META[requires];

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Setup required</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{text}</p>
        </div>
        <Button onClick={() => navigate(href)}>{label}</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </AppLayout>
  );
}
