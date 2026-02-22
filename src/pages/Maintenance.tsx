import { AppLayout } from "@/components/layout/AppLayout";
import { Wrench, AlertTriangle, CheckCircle, Clock, FileText, Shield } from "lucide-react";

const maintenanceSchedule = [
  { trailer: "Sweet Scoops", task: "Generator service", due: "Mar 15", status: "Upcoming", priority: "Medium" },
  { trailer: "Kettle Kings", task: "Brake inspection", due: "In Progress", status: "In Progress", priority: "High" },
  { trailer: "Brew Mobile", task: "Espresso machine descaling", due: "Apr 2", status: "Upcoming", priority: "Low" },
  { trailer: "Sweet Scoops", task: "Refrigeration check", due: "Apr 10", status: "Upcoming", priority: "Medium" },
  { trailer: "Kettle Kings", task: "Tire rotation", due: "Completed Feb 28", status: "Completed", priority: "Low" },
];

const cleaningLogs = [
  { trailer: "Sweet Scoops", date: "Mar 1", type: "Deep Clean", staff: "Maria Lopez" },
  { trailer: "Brew Mobile", date: "Mar 1", type: "Standard", staff: "Tyler Chen" },
  { trailer: "Kettle Kings", date: "Feb 28", type: "Deep Clean", staff: "Marco Reyes" },
  { trailer: "Sweet Scoops", date: "Feb 25", type: "Standard", staff: "Aisha Johnson" },
];

const permits = [
  { trailer: "Sweet Scoops", type: "Health Permit", expires: "Jun 30, 2026", status: "Valid" },
  { trailer: "Sweet Scoops", type: "Liability Insurance", expires: "Apr 15, 2026", status: "Expiring Soon" },
  { trailer: "Brew Mobile", type: "Health Permit", expires: "Aug 12, 2026", status: "Valid" },
  { trailer: "Brew Mobile", type: "Vehicle Registration", expires: "Mar 20, 2026", status: "Expiring Soon" },
  { trailer: "Kettle Kings", type: "Health Permit", expires: "May 5, 2026", status: "Valid" },
  { trailer: "Kettle Kings", type: "Liability Insurance", expires: "Jul 18, 2026", status: "Valid" },
];

export default function Maintenance() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-1">Keep your fleet in top shape with scheduled maintenance and compliance tracking.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Scheduled Tasks", value: "4", icon: Wrench },
            { label: "In Progress", value: "1", icon: Clock },
            { label: "Permits Expiring", value: "2", icon: AlertTriangle, alert: true },
            { label: "Completed (30d)", value: "6", icon: CheckCircle },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.alert ? "text-warning" : "text-primary"}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className={`text-xl font-bold ${s.alert ? "text-warning" : "text-card-foreground"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Maintenance Schedule */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">Maintenance Schedule</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Trailer", "Task", "Due", "Priority", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maintenanceSchedule.map((m, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-card-foreground">{m.trailer}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.task}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.due}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.priority === "High" ? "bg-destructive/10 text-destructive" :
                        m.priority === "Medium" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{m.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.status === "Completed" ? "bg-success/10 text-success" :
                        m.status === "In Progress" ? "bg-info/10 text-info" :
                        "bg-secondary text-secondary-foreground"
                      }`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cleaning Logs */}
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Cleaning Logs</h3>
            </div>
            <div className="divide-y divide-border">
              {cleaningLogs.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{c.trailer}</p>
                    <p className="text-xs text-muted-foreground">{c.type} · {c.staff}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Permits & Insurance */}
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Permits & Insurance</h3>
            </div>
            <div className="divide-y divide-border">
              {permits.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.trailer} — {p.type}</p>
                    <p className="text-xs text-muted-foreground">Expires: {p.expires}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.status === "Valid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
