import { AppLayout } from "@/components/layout/AppLayout";
import { Settings as SettingsIcon, User, Bell, Truck, CreditCard, Shield, Palette, ArrowRight, Users, Loader2, Monitor } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const baseSections = [
  { id: "profile", title: "Profile", description: "Manage your account details and preferences.", icon: User },
  { id: "notifications", title: "Notifications", description: "Configure alerts for bookings, events, and maintenance.", icon: Bell },
  { id: "trailers", title: "Trailers", description: "Add, remove, or configure your fleet.", icon: Truck, href: "/trailers" },
  { id: "billing", title: "Billing", description: "Manage subscription, payment methods, and invoices.", icon: CreditCard },
  { id: "security", title: "Security", description: "Password, two-factor authentication, and access control.", icon: Shield },
  { id: "team", title: "Team & Roles", description: "Manage user roles and permissions.", icon: Users, ownerOnly: true },
  { id: "appearance", title: "Appearance", description: "Customize your dashboard theme and layout.", icon: Palette },
] as const;

type SectionId = typeof baseSections[number]["id"];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner } = useRoleAccess();
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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");

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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your TrailerOS account and preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSectionClick(s)}
              className={`flex items-start gap-4 rounded-xl border bg-card p-5 shadow-card text-left hover:shadow-card-hover transition-all ${
                activeSection === s.id && !("href" in s && s.href)
                  ? "border-primary ring-1 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary shrink-0">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-card-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
              </div>
              {"href" in s && s.href && <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />}
            </button>
          ))}
        </div>

        {/* Profile Section */}
        {activeSection === "profile" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Profile Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
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
            <Button
              className="mt-5"
              onClick={() => updateProfile.mutate({ full_name: fullName, business_name: businessName, phone, timezone })}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Notification Preferences</h3>
            </div>
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
            </div>
            <Button className="mt-5" onClick={() => toast.success("Notification preferences saved")}>
              Save Preferences
            </Button>
          </div>
        )}

        {/* Billing Section */}
        {activeSection === "billing" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Billing & Subscription</h3>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="rounded-lg bg-background border border-border p-4">
                <p className="text-sm font-semibold text-card-foreground">Current Plan</p>
                <p className="text-2xl font-bold text-primary mt-1">Pro</p>
                <p className="text-xs text-muted-foreground mt-1">Unlimited trailers, staff, and events</p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Next billing date</span>
                <span className="text-sm font-medium text-card-foreground">April 1, 2026</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Monthly cost</span>
                <span className="text-sm font-medium text-card-foreground">$49.00/mo</span>
              </div>
            </div>
          </div>
        )}

        {/* Security Section */}
        {activeSection === "security" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Security Settings</h3>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!user?.email) return;
                    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                    if (error) toast.error(error.message);
                    else toast.success("Password reset email sent!");
                  }}
                >
                  Send Reset Email
                </Button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Coming Soon</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Active Sessions</p>
                  <p className="text-xs text-muted-foreground">Manage your active login sessions</p>
                </div>
                <span className="text-sm font-medium text-card-foreground">1 device</span>
              </div>
            </div>
          </div>
        )}

        {/* Team & Roles Section (Owner only) */}
        {activeSection === "team" && isOwner && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Team & Roles</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Assign roles to control what each team member can see and do. <strong>Owner</strong> = full access. <strong>Manager</strong> = manage operations. <strong>Staff</strong> = POS, calendar, and basic views only.
            </p>
            {teamLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading team...
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {teamMembers?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.profile?.full_name || "Unnamed User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.business_name || "No business name"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.user_id === user?.id ? (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {member.role} (you)
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value as "owner" | "manager" | "staff" })}
                          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                        >
                          <option value="owner">Owner</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
                {(!teamMembers || teamMembers.length === 0) && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No team members found. Invite users by having them sign up.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Appearance Section */}
        {activeSection === "appearance" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Palette className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Appearance</h3>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Light</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Compact Mode</p>
                  <p className="text-xs text-muted-foreground">Use a denser layout for more information</p>
                </div>
                <input type="checkbox" className="rounded border-border text-primary h-4 w-4" />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Sidebar Collapsed by Default</p>
                  <p className="text-xs text-muted-foreground">Start with the sidebar minimized</p>
                </div>
                <input type="checkbox" className="rounded border-border text-primary h-4 w-4" />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
