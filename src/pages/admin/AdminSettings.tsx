import { AdminLayout } from "./AdminLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlaskConical, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminSettings() {
  const [resetting, setResetting] = useState(false);
  const queryClient = useQueryClient();

  const handleResetDemo = async () => {
    if (!confirm("This will delete ALL demo org data and reseed it. Cone Corral data will NOT be touched. Continue?")) return;
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("reset-demo-data", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      queryClient.invalidateQueries();
      toast.success("Demo data reset successfully!");
    } catch (e: any) {
      toast.error("Reset failed: " + (e.message || "Unknown error"));
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Global configuration for the VendorFlow SaaS platform.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 max-w-2xl">
          <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Default Plans</h3>
          <div className="space-y-3">
            {["Free", "Starter", "Pro", "Enterprise"].map((plan) => (
              <div key={plan} className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{plan}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan === "Free" && "Limited features, 1 trailer, 2 staff"}
                    {plan === "Starter" && "1 trailer, 2 staff, basic POS & events"}
                    {plan === "Pro" && "Unlimited trailers, AI discovery, fleet overview"}
                    {plan === "Enterprise" && "Custom integrations, priority support"}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 sm:px-3 py-1 text-xs font-medium text-secondary-foreground shrink-0">
                  {plan === "Free" ? "$0/mo" : plan === "Starter" ? "$29/mo" : plan === "Pro" ? "$49/mo" : "Custom"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Data Management */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Demo Environment</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Reset the TrailerOS Demo organization to its original seeded state.
            This clears all demo transactional data and re-creates the sample dataset.
            <strong className="text-foreground"> Cone Corral data is never touched.</strong>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDemo}
            disabled={resetting}
            className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
            )}
            {resetting ? "Resetting..." : "Reset Demo Data"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
