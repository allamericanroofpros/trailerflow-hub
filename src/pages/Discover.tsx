import { AppLayout } from "@/components/layout/AppLayout";
import { Search, MapPin, Calendar, DollarSign, Sparkles, Plus, SlidersHorizontal } from "lucide-react";

const opportunities = [
  { name: "Bay Area Food Truck Rally", date: "Jun 8–9", location: "San Francisco, CA", distance: "12 mi", type: "Festival", profitEst: "$3,400–$5,100", aiRank: 96, attendance: "15,000" },
  { name: "Sunset Concert Series", date: "Jun 14", location: "Santa Cruz, CA", distance: "45 mi", type: "Concert", profitEst: "$1,800–$2,600", aiRank: 88, attendance: "4,000" },
  { name: "Tech Park Lunch Pop-up", date: "Jun 18", location: "Palo Alto, CA", distance: "8 mi", type: "Corporate", profitEst: "$900–$1,400", aiRank: 82, attendance: "500" },
  { name: "Farmers Market — Downtown", date: "Every Sat", location: "San Jose, CA", distance: "5 mi", type: "Market", profitEst: "$600–$1,000/wk", aiRank: 79, attendance: "2,000" },
  { name: "Pride Parade After Party", date: "Jun 28", location: "Oakland, CA", distance: "22 mi", type: "Festival", profitEst: "$4,200–$6,000", aiRank: 94, attendance: "25,000" },
  { name: "School End-of-Year Bash", date: "Jun 12", location: "Cupertino, CA", distance: "10 mi", type: "School", profitEst: "$700–$1,100", aiRank: 61, attendance: "800" },
];

export default function Discover() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover Events</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered event discovery to grow your business.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 flex-1 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder="Search events, locations..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          {["Region", "Date Range", "Event Type", "Distance"].map((f) => (
            <button key={f} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors">
              {f}
              <SlidersHorizontal className="h-3 w-3" />
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opp) => (
            <div key={opp.name} className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{opp.name}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {opp.date}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {opp.location} · {opp.distance}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-bold text-primary">{opp.aiRank}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-background border border-border p-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Profitability Est.</p>
                  <p className="text-sm font-semibold text-card-foreground">{opp.profitEst}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Attendance</p>
                  <p className="text-sm font-semibold text-card-foreground">{opp.attendance}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{opp.type}</span>
                <div className="flex-1" />
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Plus className="h-3 w-3" /> Add to Pipeline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
