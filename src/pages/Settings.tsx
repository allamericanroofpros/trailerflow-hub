import { AppLayout } from "@/components/layout/AppLayout";
import { Settings as SettingsIcon, User, Bell, Truck, CreditCard, Shield, Palette, ArrowRight, Users, Loader2, Monitor, Check, ExternalLink, Receipt, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { TIERS, TierKey } from "@/config/tiers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useOrg } from "@/contexts/OrgContext";


const baseSections = [
  { id: "profile", title: "Profile", description: "Manage your account details and preferences.", icon: User },
  { id: "pos", title: "POS Terminal", description: "Configure terminal lock mode and register behavior.", icon: Monitor, ownerOnly: true },
  { id: "payments", title: "Payments & Fees", description: "Card surcharge, fee pass-through, and payment settings.", icon: Receipt, ownerOnly: true },
  { id: "notifications", title: "Notifications", description: "Configure alerts for bookings, events, and maintenance.", icon: Bell },
  { id: "trailers", title: "Trailers", description: "Add, remove, or configure your fleet.", icon: Truck, href: "/trailers" },
  { id: "billing", title: "Billing", description: "Manage subscription, payment methods, and invoices.", icon: CreditCard },
  { id: "security", title: "Security", description: "Password, two-factor authentication, and access control.", icon: Shield },
  { id: "team", title: "Team & Roles", description: "Manage user roles and permissions.", icon: Users, ownerOnly: true },
  { id: "appearance", title: "Appearance", description: "Customize your dashboard theme and layout.", icon: Palette },
] as const;

type SectionId = typeof baseSections[number]["id"];

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SectionId>(
    () => (searchParams.get("section") as SectionId) || "profile"
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner } = useRoleAccess();
  const { currentOrg, refreshOrg } = useOrg();
  const { subscribed, tier, subscriptionEnd, cancelAtPeriodEnd, loading: subLoading, startCheckout, openPortal, checkSubscription } = useSubscription();
  const qc = useQueryClient();

  const sections = baseSections.filter((s) => !("ownerOnly" in s && s.ownerOnly) || isOwner);

  // Team & roles data (owner only)
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ["team_roles"],
    enabled: isOwner,
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("*");
      if (!roles) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
      return roles.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.user_id === r.user_id),
      }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "owner" | "manager" | "staff" }) => {
      const { error } = await supabase.from("user_roles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_roles"] });
      toast.success("Role updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [businessName, setBusinessName] = useState("");
  const [posLockMode, setPosLockMode] = useState(() => localStorage.getItem("pos_lock_mode") === "true");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");

  // Surcharge settings
  const [surchargeEnabled, setSurchargeEnabled] = useState(false);
  const [surchargeLabel, setSurchargeLabel] = useState("Non-Cash Adjustment");
  const [surchargePercent, setSurchargePercent] = useState("3.0");
  const [surchargeFlat, setSurchargeFlat] = useState("");
  const [surchargeCap, setSurchargeCap] = useState("");

  // Tax settings
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxLabel, setTaxLabel] = useState("Sales Tax");
  const [taxPercent, setTaxPercent] = useState("0");
  const [taxInclusive, setTaxInclusive] = useState(false);

  // Auto-refresh org data when landing on billing (e.g. returning from Stripe)
  useEffect(() => {
    if (activeSection === "billing") {
      refreshOrg();
    }
  }, [activeSection, refreshOrg]);

  const [paymentSettingsLoaded, setPaymentSettingsLoaded] = useState(false);

  useEffect(() => {
    if (currentOrg && !paymentSettingsLoaded) {
      const org = currentOrg as any;
      setSurchargeEnabled(org.surcharge_enabled ?? false);
      setSurchargeLabel(org.surcharge_label ?? "Non-Cash Adjustment");
      setSurchargePercent(String(org.surcharge_percent ?? 3.0));
      setSurchargeFlat(org.surcharge_flat != null ? String(org.surcharge_flat) : "");
      setSurchargeCap(org.surcharge_cap != null ? String(org.surcharge_cap) : "");
      setTaxEnabled(org.tax_enabled ?? true);
      setTaxLabel(org.tax_label ?? "Sales Tax");
      setTaxPercent(String(org.tax_percent ?? 0));
      setTaxInclusive(org.tax_inclusive ?? false);
      setPaymentSettingsLoaded(true);
    }
  }, [currentOrg, paymentSettingsLoaded]);

  const saveSurcharge = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No org");
      const { error } = await supabase.from("organizations").update({
        surcharge_enabled: surchargeEnabled,
        surcharge_label: surchargeLabel,
        surcharge_percent: parseFloat(surchargePercent) || 3.0,
        surcharge_flat: surchargeFlat ? parseFloat(surchargeFlat) : null,
        surcharge_cap: surchargeCap ? parseFloat(surchargeCap) : null,
        tax_enabled: taxEnabled,
        tax_label: taxLabel,
        tax_percent: parseFloat(taxPercent) || 0,
        tax_inclusive: taxInclusive,
      } as any).eq("id", currentOrg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_memberships"] });
      toast.success("Payment settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Sync form state when profile loads
  const profileLoaded = profile && !businessName && !fullName;
  if (profileLoaded) {
    setBusinessName(profile.business_name || "");
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setTimezone(profile.timezone || "America/Los_Angeles");
  }

  const updateProfile = useMutation({
    mutationFn: async (updates: Record<string, string | null>) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSectionClick = (section: typeof sections[number]) => {
    if ("href" in section && section.href) {
      navigate(section.href);
    } else {
      setActiveSection(section.id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-3 animate-fade-in max-w-3xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your VendorFlow account and preferences.</p>
        </div>

        {sections.map((s) => {
          const isOpen = activeSection === s.id && !("href" in s && s.href);
          return (
            <div key={s.id} className="rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all">
              <button
                onClick={() => handleSectionClick(s)}
                className="flex items-center gap-4 w-full p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-card-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                </div>
                {"href" in s && s.href
                  ? <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                }
              </button>

              {/* Inline content */}
              {isOpen && (
                <div className="border-t border-border p-4 sm:p-6">
                  {/* Profile */}
                  {s.id === "profile" && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Business Name</label>
                          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Phone</label>
                          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Email</label>
                          <Input value={user?.email || ""} disabled className="mt-1 opacity-60" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1" />
                        </div>
                      </div>
                      <Button className="mt-5" onClick={() => updateProfile.mutate({ full_name: fullName, business_name: businessName, phone, timezone })} disabled={updateProfile.isPending}>
                        {updateProfile.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}

                  {/* POS Terminal */}
                  {s.id === "pos" && (
                    <div className="space-y-4 max-w-lg">
                      <label className="flex items-center justify-between py-3 border-b border-border cursor-pointer">
                        <div>
                          <p className="text-sm font-medium text-card-foreground">POS Lock Mode</p>
                          <p className="text-xs text-muted-foreground">Exiting POS requires an owner or manager PIN.</p>
                        </div>
                        <input type="checkbox" checked={posLockMode} onChange={(e) => { const val = e.target.checked; setPosLockMode(val); localStorage.setItem("pos_lock_mode", val ? "true" : "false"); toast.success(val ? "POS Lock Mode enabled" : "POS Lock Mode disabled"); }} className="rounded border-border text-primary h-5 w-5" />
                      </label>
                      <p className="text-[11px] text-muted-foreground"><strong>Tip:</strong> Turn this on when employees work the register so they stay focused on orders.</p>
                    </div>
                  )}

                  {/* Payments & Fees */}
                  {s.id === "payments" && (
                    <div className="space-y-5 max-w-lg">
                      <label className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-card-foreground">Enable Card Surcharge</p>
                          <p className="text-xs text-muted-foreground">Add a fee to card transactions</p>
                        </div>
                        <Switch checked={surchargeEnabled} onCheckedChange={setSurchargeEnabled} />
                      </label>
                      {surchargeEnabled && (
                        <div className="space-y-4 pl-1 border-l-2 border-primary/20 ml-1">
                          <div className="pl-4">
                            <label className="text-xs font-medium text-muted-foreground">Fee Label (shown to customer)</label>
                            <Input value={surchargeLabel} onChange={(e) => setSurchargeLabel(e.target.value)} className="mt-1" placeholder="Non-Cash Adjustment" />
                          </div>
                          <div className="pl-4">
                            <label className="text-xs font-medium text-muted-foreground">Percentage (%)</label>
                            <Input type="number" step="0.1" min="0" max="10" value={surchargePercent} onChange={(e) => setSurchargePercent(e.target.value)} className="mt-1" />
                            <p className="text-[11px] text-muted-foreground mt-1">Most businesses charge 2.5% – 3.5%</p>
                          </div>
                          <div className="pl-4">
                            <label className="text-xs font-medium text-muted-foreground">Flat Fee ($) — optional</label>
                            <Input type="number" step="0.01" min="0" value={surchargeFlat} onChange={(e) => setSurchargeFlat(e.target.value)} className="mt-1" placeholder="0.00" />
                          </div>
                          <div className="pl-4">
                            <label className="text-xs font-medium text-muted-foreground">Maximum Cap ($) — optional</label>
                            <Input type="number" step="0.01" min="0" value={surchargeCap} onChange={(e) => setSurchargeCap(e.target.value)} className="mt-1" placeholder="No cap" />
                          </div>
                        </div>
                      )}
                      <div className="border-t border-border pt-5 mt-5">
                        <h4 className="text-sm font-semibold text-card-foreground mb-1">Tax Settings</h4>
                        <p className="text-xs text-muted-foreground mb-4">Configure sales tax for POS checkout.</p>
                        <label className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-medium text-card-foreground">Enable Tax</p>
                            <p className="text-xs text-muted-foreground">Add tax to orders during checkout</p>
                          </div>
                          <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
                        </label>
                        {taxEnabled && (
                          <div className="space-y-4 pl-1 border-l-2 border-primary/20 ml-1">
                            <div className="pl-4">
                              <label className="text-xs font-medium text-muted-foreground">Tax Label (shown on receipts)</label>
                              <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} className="mt-1" placeholder="Sales Tax" />
                            </div>
                            <div className="pl-4">
                              <label className="text-xs font-medium text-muted-foreground">Tax Rate (%)</label>
                              <Input type="number" step="0.01" min="0" max="30" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} className="mt-1" placeholder="0" />
                              <p className="text-[11px] text-muted-foreground mt-1">e.g. 8.75 for 8.75% sales tax</p>
                            </div>
                            <label className="flex items-center justify-between pl-4">
                              <div>
                                <p className="text-sm font-medium text-card-foreground">Tax Included in Prices</p>
                                <p className="text-xs text-muted-foreground">Menu prices already include tax.</p>
                              </div>
                              <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />
                            </label>
                          </div>
                        )}
                      </div>
                      <Button onClick={() => saveSurcharge.mutate()} disabled={saveSurcharge.isPending}>
                        {saveSurcharge.isPending ? "Saving..." : "Save Payment Settings"}
                      </Button>
                    </div>
                  )}

                  {/* Notifications */}
                  {s.id === "notifications" && (
                    <div className="space-y-4 max-w-lg">
                      {[
                        { label: "New booking requests", desc: "Get notified when a client submits a booking" },
                        { label: "Event reminders", desc: "Reminders 24h before scheduled events" },
                        { label: "Maintenance alerts", desc: "When maintenance tasks are due or overdue" },
                        { label: "Staff scheduling conflicts", desc: "Alerts when staff availability conflicts arise" },
                      ].map((n) => (
                        <label key={n.label} className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer">
                          <div>
                            <p className="text-sm font-medium text-card-foreground">{n.label}</p>
                            <p className="text-xs text-muted-foreground">{n.desc}</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded border-border text-primary h-4 w-4" />
                        </label>
                      ))}
                      <Button onClick={() => toast.success("Notification preferences saved")}>Save Preferences</Button>
                    </div>
                  )}

                  {/* Billing */}
                  {s.id === "billing" && (
                    <div>
                      {subLoading ? (
                        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Checking subscription...
                        </div>
                      ) : (
                        <>
                          {subscribed && subscriptionEnd && (
                            <div className={`rounded-lg border p-3 mb-5 ${cancelAtPeriodEnd ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"}`}>
                              <p className="text-xs text-muted-foreground">
                                Current plan: <span className="font-semibold text-primary capitalize">{tier || "Active"}</span>
                                {cancelAtPeriodEnd
                                  ? <>{" · "}<span className="text-destructive font-semibold">Cancels {new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></>
                                  : <>{" · "}Renews {new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                                }
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(Object.entries(TIERS) as [TierKey, typeof TIERS[TierKey]][]).map(([key, t]) => {
                              const isCurrent = subscribed && tier === key;
                              return (
                                <div key={key} className={`relative rounded-xl border p-5 transition-all ${isCurrent ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border bg-background hover:border-primary/40"} ${key === "pro" && !isCurrent ? "ring-1 ring-primary/10" : ""}`}>
                                  {key === "pro" && !isCurrent && <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">Most Popular</span>}
                                  {isCurrent && <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">Your Plan</span>}
                                  <h4 className="text-sm font-bold text-foreground capitalize">{t.name}</h4>
                                  <div className="mt-2 mb-4"><span className="text-3xl font-extrabold text-foreground">${t.price}</span><span className="text-sm text-muted-foreground">/mo</span></div>
                                  <ul className="space-y-2 mb-5">{t.features.map((f) => <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />{f}</li>)}</ul>
                                  {isCurrent ? <Button variant="outline" size="sm" className="w-full" disabled>Current Plan</Button> : (
                                    <Button size="sm" className="w-full" variant={key === "pro" ? "default" : "outline"} onClick={async () => { try { await startCheckout(t.price_id); } catch (e: any) { toast.error(e.message || "Checkout failed"); } }}>
                                      {subscribed ? `Switch to ${t.name}` : `Get ${t.name}`}
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <Button variant="ghost" size="sm" onClick={() => { checkSubscription(); refreshOrg(); toast.success("Subscription status refreshed"); }}>Refresh Status</Button>
                            {subscribed && <Button variant="outline" size="sm" onClick={async () => { try { await openPortal(); } catch { toast.error("Could not open billing portal"); } }}><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Manage Subscription</Button>}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Security */}
                  {s.id === "security" && (
                    <div className="space-y-4 max-w-lg">
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div><p className="text-sm font-medium text-card-foreground">Change Password</p><p className="text-xs text-muted-foreground">Update your account password</p></div>
                        <Button variant="outline" size="sm" onClick={async () => { if (!user?.email) return; const { error } = await supabase.auth.resetPasswordForEmail(user.email); if (error) toast.error(error.message); else toast.success("Password reset email sent!"); }}>Send Reset Email</Button>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div><p className="text-sm font-medium text-card-foreground">Two-Factor Authentication</p><p className="text-xs text-muted-foreground">Add an extra layer of security</p></div>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Coming Soon</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div><p className="text-sm font-medium text-card-foreground">Active Sessions</p><p className="text-xs text-muted-foreground">Manage your active login sessions</p></div>
                        <span className="text-sm font-medium text-card-foreground">1 device</span>
                      </div>
                    </div>
                  )}

                  {/* Team & Roles */}
                  {s.id === "team" && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-4"><strong>Owner</strong> = full access. <strong>Manager</strong> = manage operations. <strong>Staff</strong> = POS, calendar, and basic views only.</p>
                      {teamLoading ? (
                        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading team...</div>
                      ) : (
                        <div className="space-y-3">
                          {teamMembers?.map((member) => (
                            <div key={member.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                              <div><p className="text-sm font-medium text-foreground">{member.profile?.full_name || "Unnamed User"}</p><p className="text-xs text-muted-foreground">{member.profile?.business_name || "No business name"}</p></div>
                              <div className="flex items-center gap-2">
                                {member.user_id === user?.id ? (
                                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{member.role} (you)</span>
                                ) : (
                                  <select value={member.role} onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value as "owner" | "manager" | "staff" })} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
                                    <option value="owner">Owner</option><option value="manager">Manager</option><option value="staff">Staff</option>
                                  </select>
                                )}
                              </div>
                            </div>
                          ))}
                          {(!teamMembers || teamMembers.length === 0) && <p className="text-sm text-muted-foreground py-4 text-center">No team members found.</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Appearance */}
                  {s.id === "appearance" && (
                    <div className="space-y-4 max-w-lg">
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div><p className="text-sm font-medium text-card-foreground">Theme</p><p className="text-xs text-muted-foreground">Choose your preferred color scheme</p></div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Light</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-border">
                        <div><p className="text-sm font-medium text-card-foreground">Compact Mode</p><p className="text-xs text-muted-foreground">Use a denser layout for more information</p></div>
                        <input type="checkbox" className="rounded border-border text-primary h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div><p className="text-sm font-medium text-card-foreground">Sidebar Collapsed by Default</p><p className="text-xs text-muted-foreground">Start with the sidebar minimized</p></div>
                        <input type="checkbox" className="rounded border-border text-primary h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
      </div>
    </AppLayout>
  );
}
