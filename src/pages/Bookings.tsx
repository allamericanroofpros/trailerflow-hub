import { AppLayout } from "@/components/layout/AppLayout";
import { ClipboardList, DollarSign, Check, Clock, Eye } from "lucide-react";

const bookings = [
  { id: "BK-001", client: "Sarah Mitchell", event: "Birthday Party", date: "Mar 8", trailer: "Sweet Scoops", package: "Premium Scoop Bar", status: "Confirmed", deposit: "$350", balance: "$650", total: "$1,000" },
  { id: "BK-002", client: "David Park", event: "Company Picnic", date: "Mar 15", trailer: "Brew Mobile", package: "Coffee + Pastry", status: "Pending", deposit: "—", balance: "$800", total: "$800" },
  { id: "BK-003", client: "Emily Torres", event: "Wedding Reception", date: "Mar 22", trailer: "Sweet Scoops", package: "Sundae Station", status: "Confirmed", deposit: "$500", balance: "$1,200", total: "$1,700" },
  { id: "BK-004", client: "James Wilson", event: "Block Party", date: "Apr 5", trailer: "Kettle Kings", package: "Kettle Corn Stand", status: "Pending", deposit: "—", balance: "$400", total: "$400" },
];

const packages = [
  { name: "Scoop Bar", price: "$600", description: "Up to 100 guests, 6 flavors, toppings bar", trailer: "Sweet Scoops" },
  { name: "Premium Sundae Station", price: "$1,200", description: "Up to 200 guests, 10 flavors, premium toppings, waffle cones", trailer: "Sweet Scoops" },
  { name: "Coffee Cart Experience", price: "$800", description: "Espresso, cold brew, pastries for 150 guests", trailer: "Brew Mobile" },
  { name: "Kettle Corn Stand", price: "$400", description: "Unlimited kettle corn for 4 hours", trailer: "Kettle Kings" },
];

export default function Bookings() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client bookings and public availability.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Pending Requests", value: "2", icon: Clock, color: "text-warning" },
            { label: "Confirmed", value: "2", icon: Check, color: "text-success" },
            { label: "Deposits Collected", value: "$850", icon: DollarSign, color: "text-primary" },
            { label: "Balance Due", value: "$3,050", icon: ClipboardList, color: "text-info" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Bookings Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Booking Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["ID", "Client", "Event", "Date", "Package", "Status", "Deposit", "Balance"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.id}</td>
                    <td className="px-4 py-3 font-medium text-card-foreground">{b.client}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.event}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.package}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        b.status === "Confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-card-foreground font-medium">{b.deposit}</td>
                    <td className="px-4 py-3 text-card-foreground font-medium">{b.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service Packages Preview */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Public Booking Packages</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <div key={pkg.name} className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow">
                <p className="text-sm font-semibold text-card-foreground">{pkg.name}</p>
                <p className="text-xl font-bold text-primary mt-1">{pkg.price}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{pkg.description}</p>
                <span className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{pkg.trailer}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
