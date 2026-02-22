import { AppLayout } from "@/components/layout/AppLayout";
import { Sparkles, MapPin, Calendar, Users as UsersIcon, DollarSign, Plus, ChevronRight, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface EventItem {
  id: string;
  name: string;
  date: string;
  location: string;
  trailer: string;
  revenue: string;
  confidence: number;
  attendance: string;
}

const stages = ["Lead", "Applied", "Tentative", "Confirmed", "Completed", "Closed"] as const;

const stageColors: Record<string, string> = {
  Lead: "border-t-muted-foreground",
  Applied: "border-t-info",
  Tentative: "border-t-warning",
  Confirmed: "border-t-success",
  Completed: "border-t-primary",
  Closed: "border-t-border",
};

const mockEvents: Record<string, EventItem[]> = {
  Lead: [
    { id: "1", name: "Summer Food Fest", date: "Jun 14–15", location: "Downtown Park", trailer: "Sweet Scoops", revenue: "$2,800–$4,200", confidence: 65, attendance: "5,000+" },
    { id: "2", name: "Tech Campus Lunch", date: "Jun 20", location: "Innovation Hub", trailer: "Brew Mobile", revenue: "$800–$1,200", confidence: 40, attendance: "300" },
  ],
  Applied: [
    { id: "3", name: "Riverside Market", date: "May 24", location: "River Walk", trailer: "Kettle Kings", revenue: "$1,400–$1,900", confidence: 55, attendance: "2,000" },
  ],
  Tentative: [
    { id: "4", name: "Corporate Wellness Day", date: "May 18", location: "BioTech Campus", trailer: "Brew Mobile", revenue: "$1,600–$2,200", confidence: 72, attendance: "400" },
    { id: "5", name: "Spring Wedding Expo", date: "May 25", location: "Grand Hall", trailer: "Sweet Scoops", revenue: "$2,200–$3,100", confidence: 78, attendance: "800" },
  ],
  Confirmed: [
    { id: "6", name: "Founders Day Festival", date: "May 10", location: "City Square", trailer: "Sweet Scoops", revenue: "$3,800–$5,200", confidence: 92, attendance: "8,000" },
    { id: "7", name: "Little League Finals", date: "May 12", location: "Sports Complex", trailer: "Kettle Kings", revenue: "$1,200–$1,800", confidence: 88, attendance: "1,500" },
    { id: "8", name: "Art Walk Nights", date: "May 16", location: "Gallery District", trailer: "Brew Mobile", revenue: "$900–$1,400", confidence: 85, attendance: "600" },
  ],
  Completed: [
    { id: "9", name: "Earth Day Market", date: "Apr 22", location: "Green Park", trailer: "Kettle Kings", revenue: "$2,100", confidence: 100, attendance: "3,200" },
  ],
  Closed: [
    { id: "10", name: "Winter Gala (Lost)", date: "Feb 14", location: "Convention Center", trailer: "—", revenue: "—", confidence: 0, attendance: "—" },
  ],
};

const selectedEvent = mockEvents.Confirmed[0];

const aiInsights = [
  "Founders Day historically yields 15-20% above forecast. Consider adding a second trailer.",
  "Staff overtime risk: 3 events within 48 hours for Brew Mobile.",
  "Sweet Scoops performs 32% better at festivals vs. corporate events.",
];

export default function EventsHub() {
  const [selected, setSelected] = useState<EventItem>(selectedEvent);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Events Hub</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your event pipeline from discovery to completion.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
          {/* Kanban Board */}
          <div className="flex gap-4 min-w-max flex-1">
            {stages.map((stage) => (
              <div key={stage} className="w-[260px] shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{stage}</h3>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {mockEvents[stage]?.length || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {mockEvents[stage]?.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelected(event)}
                      className={`w-full rounded-lg border-t-[3px] ${stageColors[stage]} border border-border bg-card p-3.5 text-left shadow-card hover:shadow-card-hover transition-all ${
                        selected.id === event.id ? "ring-2 ring-primary/30" : ""
                      }`}
                    >
                      <p className="text-sm font-semibold text-card-foreground">{event.name}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {event.date}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-primary">{event.revenue}</span>
                        {event.confidence > 0 && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            event.confidence >= 80
                              ? "bg-success/10 text-success"
                              : event.confidence >= 60
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {event.confidence}%
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Event Detail + AI Panel */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Event Detail */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-card-foreground">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{selected.date} · {selected.location}</p>
              </div>
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                {selected.confidence}% confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Attendance Est.", value: selected.attendance, icon: UsersIcon },
                { label: "Forecasted Revenue", value: selected.revenue, icon: DollarSign },
                { label: "Assigned Trailer", value: selected.trailer, icon: MapPin },
                { label: "Risk Level", value: "Low", icon: AlertTriangle },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-background p-3 border border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <item.icon className="h-3 w-3" />
                    <span className="text-[11px]">{item.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-card-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Checklist */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Event Checklist</h4>
              <div className="space-y-2">
                {["Confirm vendor fee", "Assign staff (2 needed)", "Load trailer inventory", "Submit insurance docs", "Route & travel plan"].map((item, i) => (
                  <label key={item} className="flex items-center gap-3 rounded-lg bg-background border border-border p-3 cursor-pointer hover:shadow-card transition-shadow">
                    <input type="checkbox" defaultChecked={i < 2} className="rounded border-border text-primary" />
                    <span className={`text-sm ${i < 2 ? "text-muted-foreground line-through" : "text-card-foreground"}`}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">AI Insights</h3>
            </div>
            <div className="space-y-3">
              {aiInsights.map((insight, i) => (
                <div key={i} className="rounded-lg bg-background border border-border p-3.5">
                  <p className="text-sm text-card-foreground leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg gradient-warm p-4">
              <p className="text-sm font-medium text-primary-foreground">Suggested Action</p>
              <p className="text-xs text-primary-foreground/80 mt-1">Deploy Sweet Scoops + Brew Mobile to Founders Day for estimated $6,200–$8,400 combined revenue.</p>
              <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground underline underline-offset-2">
                Apply Suggestion <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
