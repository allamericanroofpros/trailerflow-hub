import { AdminLayout } from "./AdminLayout";

export default function AdminSettings() {
  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global configuration for the TrailerOS SaaS platform.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 max-w-2xl">
          <h3 className="text-sm font-semibold text-foreground mb-4">Default Plans</h3>
          <div className="space-y-3">
            {["Free", "Pro", "Enterprise"].map((plan) => (
              <div key={plan} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{plan}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan === "Free" && "Limited features, 1 trailer, basic POS"}
                    {plan === "Pro" && "Unlimited trailers, full feature set"}
                    {plan === "Enterprise" && "Custom integrations, priority support"}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {plan === "Free" ? "$0/mo" : plan === "Pro" ? "$49/mo" : "Custom"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
