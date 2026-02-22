import { AppLayout } from "@/components/layout/AppLayout";
import { Settings as SettingsIcon, User, Bell, Truck, CreditCard, Shield, Palette } from "lucide-react";

const sections = [
  { title: "Profile", description: "Manage your account details and preferences.", icon: User },
  { title: "Notifications", description: "Configure alerts for bookings, events, and maintenance.", icon: Bell },
  { title: "Trailers", description: "Add, remove, or configure your fleet.", icon: Truck },
  { title: "Billing", description: "Manage subscription, payment methods, and invoices.", icon: CreditCard },
  { title: "Security", description: "Password, two-factor authentication, and access control.", icon: Shield },
  { title: "Appearance", description: "Customize your dashboard theme and layout.", icon: Palette },
];

export default function SettingsPage() {
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
              key={s.title}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card text-left hover:shadow-card-hover transition-shadow"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary shrink-0">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Sample Settings Section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-5">
            <SettingsIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">General Preferences</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: "Business Name", value: "Rivera's Mobile Eats" },
              { label: "Default Timezone", value: "Pacific Time (PT)" },
              { label: "Currency", value: "USD ($)" },
              { label: "Default Buffer Time", value: "90 minutes" },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{pref.label}</span>
                <span className="text-sm font-medium text-card-foreground">{pref.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
