import { AppLayout } from "@/components/layout/AppLayout";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

const days = Array.from({ length: 35 }, (_, i) => {
  const d = new Date(2026, 1, i - 1); // Feb 2026
  return { date: d.getDate(), month: d.getMonth(), full: d };
});

const trailers = [
  { name: "Sweet Scoops", color: "bg-primary" },
  { name: "Brew Mobile", color: "bg-info" },
  { name: "Kettle Kings", color: "bg-warning" },
];

const calendarEvents: { day: number; trailer: string; event: string; conflict?: boolean }[] = [
  { day: 3, trailer: "Sweet Scoops", event: "Downtown Market" },
  { day: 5, trailer: "Brew Mobile", event: "Tech Park Lunch" },
  { day: 7, trailer: "Sweet Scoops", event: "Birthday Party" },
  { day: 7, trailer: "Brew Mobile", event: "Yoga Festival", conflict: true },
  { day: 10, trailer: "Kettle Kings", event: "Founders Day" },
  { day: 10, trailer: "Sweet Scoops", event: "Founders Day" },
  { day: 12, trailer: "Brew Mobile", event: "Art Walk" },
  { day: 14, trailer: "Kettle Kings", event: "Little League" },
  { day: 15, trailer: "Sweet Scoops", event: "Wedding Expo" },
  { day: 18, trailer: "Brew Mobile", event: "Corporate Wellness" },
  { day: 21, trailer: "Sweet Scoops", event: "Spring Market" },
  { day: 22, trailer: "Kettle Kings", event: "School Fair" },
  { day: 25, trailer: "Brew Mobile", event: "Concert Series" },
  { day: 28, trailer: "Sweet Scoops", event: "Food Truck Rally" },
];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-trailer schedule with conflict detection.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold px-3">February 2026</span>
            <button className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Trailer Legend */}
        <div className="flex items-center gap-4">
          {trailers.map((t) => (
            <div key={t.name} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${t.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{t.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            <span className="text-xs font-medium text-destructive">Conflict</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((d) => (
              <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const isCurrentMonth = day.month === 1;
              const dayEvents = calendarEvents.filter((e) => e.day === day.date && isCurrentMonth);
              const hasConflict = dayEvents.some((e) => e.conflict);

              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r border-border p-2 ${
                    isCurrentMonth ? "bg-card" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isCurrentMonth ? "font-medium text-card-foreground" : "text-muted-foreground/50"}`}>
                      {day.date}
                    </span>
                    {hasConflict && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((evt, j) => {
                      const trailer = trailers.find((t) => t.name === evt.trailer);
                      return (
                        <div
                          key={j}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium truncate ${
                            evt.conflict
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : `${trailer?.color}/10 text-card-foreground`
                          }`}
                          style={!evt.conflict ? { backgroundColor: `hsl(var(--${trailer?.color === "bg-primary" ? "primary" : trailer?.color === "bg-info" ? "info" : "warning"}) / 0.1)` } : undefined}
                        >
                          {evt.event}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
