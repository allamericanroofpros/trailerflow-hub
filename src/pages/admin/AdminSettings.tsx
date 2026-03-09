import { AdminLayout } from "./AdminLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FlaskConical, RotateCcw, Loader2, Save, DollarSign,
  Percent, Shield, ToggleLeft, Receipt, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

type PlatformConfig = Record<string, any>;

function usePlatformConfig() {
  return useQuery({
    queryKey: ["platform_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config" as any)
        .select("key, value");
      if (error) throw error;
      const config: PlatformConfig = {};
      (data as any[])?.forEach((row: any) => {
        config[row.key] = row.value;
      });
      return config;
    },
  });
}

function useSaveConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("platform_config" as any)
        .update({ value, updated_at: new Date().toISOString() } as any)
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_config"] });
    },
  });
}

// ─── Platform Fees ───
function PlatformFeesSection({ config, saveConfig }: { config: PlatformConfig; saveConfig: ReturnType<typeof useSaveConfig> }) {
  const fees = config.platform_fees || { free: 1.5, starter: 0.5, pro: 0, enterprise: 0 };
  const [local, setLocal] = useState(fees);

  useEffect(() => { setLocal(fees); }, [JSON.stringify(fees)]);

  const handleSave = () => {
    saveConfig.mutate({ key: "platform_fees", value: local }, {
      onSuccess: () => toast.success("Platform fees updated"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Percent className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Platform Transaction Fees</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Percentage collected on each connected-account payment via Stripe Connect. Applied as <code className="bg-muted px-1 rounded text-[10px]">application_fee_amount</code>.
      </p>
      <div className="space-y-3">
        {(["free", "starter", "pro", "enterprise"] as const).map((plan) => (
          <div key={plan} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground capitalize">{plan}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={local[plan] ?? 0}
                onChange={(e) => setLocal({ ...local, [plan]: parseFloat(e.target.value) || 0 })}
                className="w-20 text-right text-sm"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" onClick={handleSave} disabled={saveConfig.isPending} className="mt-4 gap-1.5">
        {saveConfig.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save Fees
      </Button>
    </div>
  );
}

// ─── Feature Flags ───
function FeatureFlagsSection({ config, saveConfig }: { config: PlatformConfig; saveConfig: ReturnType<typeof useSaveConfig> }) {
  const flags = config.feature_flags || {};
  const [local, setLocal] = useState(flags);

  useEffect(() => { setLocal(flags); }, [JSON.stringify(flags)]);

  const flagLabels: Record<string, { label: string; desc: string }> = {
    ai_chat: { label: "AI Chat Assistant", desc: "Enable AI-powered chat for Starter+ plans" },
    ai_discovery: { label: "AI Event Discovery", desc: "AI-powered event search for Pro+ plans" },
    ai_forecasting: { label: "AI Revenue Forecasting", desc: "Revenue predictions on events for Pro+ plans" },
    public_bookings: { label: "Public Bookings Portal", desc: "Allow orgs to enable public booking pages" },
    fleet_overview: { label: "Fleet Overview", desc: "Multi-trailer fleet dashboard for Pro+ plans" },
    advanced_analytics: { label: "Advanced Analytics", desc: "Charts and trend analysis for Pro+ plans" },
  };

  const handleSave = () => {
    saveConfig.mutate({ key: "feature_flags", value: local }, {
      onSuccess: () => toast.success("Feature flags updated"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <ToggleLeft className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Feature Flags</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Toggle platform features globally. Disabling a feature hides it for all orgs regardless of their plan.
      </p>
      <div className="space-y-3">
        {Object.entries(flagLabels).map(([key, { label, desc }]) => (
          <label key={key} className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer">
            <div className="min-w-0 pr-4">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch
              checked={local[key] ?? true}
              onCheckedChange={(val) => setLocal({ ...local, [key]: val })}
            />
          </label>
        ))}
      </div>
      <Button size="sm" onClick={handleSave} disabled={saveConfig.isPending} className="mt-4 gap-1.5">
        {saveConfig.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save Flags
      </Button>
    </div>
  );
}

// ─── Default Tax Settings ───
function DefaultTaxSection({ config, saveConfig }: { config: PlatformConfig; saveConfig: ReturnType<typeof useSaveConfig> }) {
  const tax = config.default_tax || { enabled: true, label: "Sales Tax", percent: 0, inclusive: false };
  const [local, setLocal] = useState(tax);

  useEffect(() => { setLocal(tax); }, [JSON.stringify(tax)]);

  const handleSave = () => {
    saveConfig.mutate({ key: "default_tax", value: local }, {
      onSuccess: () => toast.success("Default tax settings updated"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Default Tax Settings</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Defaults applied to newly created organizations. Org owners can override in their own settings.
      </p>
      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div><p className="text-sm font-medium text-foreground">Enable Tax by Default</p></div>
          <Switch checked={local.enabled} onCheckedChange={(val) => setLocal({ ...local, enabled: val })} />
        </label>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tax Label</label>
          <Input value={local.label} onChange={(e) => setLocal({ ...local, label: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Default Tax Rate (%)</label>
          <Input type="number" step="0.01" min="0" max="30" value={local.percent} onChange={(e) => setLocal({ ...local, percent: parseFloat(e.target.value) || 0 })} className="mt-1" />
        </div>
        <label className="flex items-center justify-between cursor-pointer">
          <div><p className="text-sm font-medium text-foreground">Tax Inclusive by Default</p><p className="text-xs text-muted-foreground">Menu prices include tax</p></div>
          <Switch checked={local.inclusive} onCheckedChange={(val) => setLocal({ ...local, inclusive: val })} />
        </label>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saveConfig.isPending} className="mt-4 gap-1.5">
        {saveConfig.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save Tax Defaults
      </Button>
    </div>
  );
}

// ─── Default Surcharge Settings ───
function DefaultSurchargeSection({ config, saveConfig }: { config: PlatformConfig; saveConfig: ReturnType<typeof useSaveConfig> }) {
  const surcharge = config.default_surcharge || { enabled: false, label: "Non-Cash Adjustment", percent: 3.0, flat: null, cap: null };
  const [local, setLocal] = useState(surcharge);

  useEffect(() => { setLocal(surcharge); }, [JSON.stringify(surcharge)]);

  const handleSave = () => {
    saveConfig.mutate({ key: "default_surcharge", value: local }, {
      onSuccess: () => toast.success("Default surcharge settings updated"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Receipt className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Default Surcharge Settings</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Default card surcharge configuration for new organizations.
      </p>
      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div><p className="text-sm font-medium text-foreground">Enable Surcharge by Default</p></div>
          <Switch checked={local.enabled} onCheckedChange={(val) => setLocal({ ...local, enabled: val })} />
        </label>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Surcharge Label</label>
          <Input value={local.label} onChange={(e) => setLocal({ ...local, label: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Default Percentage (%)</label>
          <Input type="number" step="0.1" min="0" max="10" value={local.percent} onChange={(e) => setLocal({ ...local, percent: parseFloat(e.target.value) || 0 })} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Flat Fee ($)</label>
            <Input type="number" step="0.01" min="0" value={local.flat ?? ""} onChange={(e) => setLocal({ ...local, flat: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" placeholder="None" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Max Cap ($)</label>
            <Input type="number" step="0.01" min="0" value={local.cap ?? ""} onChange={(e) => setLocal({ ...local, cap: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" placeholder="No cap" />
          </div>
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saveConfig.isPending} className="mt-4 gap-1.5">
        {saveConfig.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save Surcharge Defaults
      </Button>
    </div>
  );
}

// ─── Plan Entitlements Overview ───
function PlanEntitlementsSection() {
  const plans = [
    { name: "Free", price: "$0/mo", trailers: "1", staff: "2", ai: "—", fleet: "—", analytics: "—" },
    { name: "Starter", price: "$29/mo", trailers: "1", staff: "5", ai: "Chat", fleet: "—", analytics: "—" },
    { name: "Pro", price: "$79/mo", trailers: "∞", staff: "∞", ai: "Full", fleet: "✓", analytics: "✓" },
    { name: "Enterprise", price: "$199/mo", trailers: "∞", staff: "∞", ai: "Full", fleet: "✓", analytics: "✓" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Plan Entitlements</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Current plan feature matrix. Limits are enforced via database triggers and UI gating.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Plan", "Price", "Trailers", "Staff", "AI", "Fleet", "Analytics"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.name} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-medium text-foreground">{p.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.price}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.trailers}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.staff}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.ai}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.fleet}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.analytics}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ───
export default function AdminSettings() {
  const [resetting, setResetting] = useState(false);
  const queryClient = useQueryClient();
  const { data: config, isLoading } = usePlatformConfig();
  const saveConfig = useSaveConfig();

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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : config ? (
          <>
            {/* Platform Transaction Fees */}
            <PlatformFeesSection config={config} saveConfig={saveConfig} />

            {/* Feature Flags */}
            <FeatureFlagsSection config={config} saveConfig={saveConfig} />

            {/* Default Tax */}
            <DefaultTaxSection config={config} saveConfig={saveConfig} />

            {/* Default Surcharge */}
            <DefaultSurchargeSection config={config} saveConfig={saveConfig} />

            {/* Plan Entitlements (read-only overview) */}
            <PlanEntitlementsSection />
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Failed to load platform configuration.</p>
          </div>
        )}

        {/* Demo Data Management */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Demo Environment</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Reset the VendorFlow Demo organization to its original seeded state.
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
