import { AppLayout } from "@/components/layout/AppLayout";
import { Users as UsersIcon, AlertTriangle, Clock, Shield, Eye } from "lucide-react";
import { useState } from "react";

const staffMembers = [
  { name: "Maria Lopez", role: "Team Lead", rate: "$22/hr", availability: "Full-time", shifts: 14, conflicts: 0, status: "Active" },
  { name: "Tyler Chen", role: "Server", rate: "$16/hr", availability: "Part-time", shifts: 8, conflicts: 1, status: "Active" },
  { name: "Aisha Johnson", role: "Server", rate: "$16/hr", availability: "Weekends", shifts: 6, conflicts: 0, status: "Active" },
  { name: "Marco Reyes", role: "Driver / Setup", rate: "$20/hr", availability: "Full-time", shifts: 12, conflicts: 2, status: "Active" },
  { name: "Sam Nguyen", role: "Server", rate: "$16/hr", availability: "Flexible", shifts: 10, conflicts: 0, status: "On Leave" },
];

const views = ["Owner", "Manager", "Staff"] as const;

export default function Staff() {
  const [view, setView] = useState<typeof views[number]>("Owner");

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your team, availability, and assignments.</p>
          </div>
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "Owner" && <Shield className="h-3 w-3" />}
                {v === "Manager" && <UsersIcon className="h-3 w-3" />}
                {v === "Staff" && <Eye className="h-3 w-3" />}
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Staff", value: "5" },
            { label: "Active Shifts (This Week)", value: "18" },
            { label: "Conflicts", value: "3", alert: true },
            { label: "Avg Hours/Week", value: "24" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.alert ? "text-destructive" : "text-card-foreground"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Staff Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Name", "Role", "Rate", "Availability", "Shifts", "Conflicts", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffMembers.map((m) => (
                  <tr key={m.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-card-foreground">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.rate}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{m.availability}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-card-foreground font-medium">{m.shifts}</td>
                    <td className="px-4 py-3">
                      {m.conflicts > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {m.conflicts}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
