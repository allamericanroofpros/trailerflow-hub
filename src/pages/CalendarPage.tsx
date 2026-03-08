import { AppLayout } from "@/components/layout/AppLayout";
import { ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useEvents } from "@/hooks/useEvents";
import { useTrailers } from "@/hooks/useTrailers";
import { useBookings } from "@/hooks/useBookings";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TRAILER_COLORS = [
  { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
  { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: trailers } = useTrailers();
  const { data: bookings } = useBookings();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Build trailer color map
  const trailerColorMap = useMemo(() => {
    const map: Record<string, typeof TRAILER_COLORS[0] & { name: string }> = {};
    trailers?.forEach((t, i) => {
      map[t.id] = { ...TRAILER_COLORS[i % TRAILER_COLORS.length], name: t.name };
    });
    return map;
  }, [trailers]);

  // Build calendar days
  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    // Previous month fill
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      result.push({ date: prevMonthDays - i, month: month - 1, year, isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ date: d, month, year, isCurrentMonth: true });
    }
    // Fill to 42 (6 rows)
    while (result.length < 42) {
      result.push({ date: result.length - firstDay - daysInMonth + 1, month: month + 1, year, isCurrentMonth: false });
    }
    return result;
  }, [year, month]);

  // Map events to days
  const eventsByDay = useMemo(() => {
    const map: Record<string, { name: string; trailerId?: string | null; type: "event" | "booking" }[]> = {};
    events?.forEach(e => {
      if (!e.event_date) return;
      const d = new Date(e.event_date + "T00:00:00");
      if (d.getMonth() === month && d.getFullYear() === year) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push({ name: e.name, trailerId: e.trailer_id, type: "event" });
      }
    });
    bookings?.forEach(b => {
      const d = new Date(b.event_date + "T00:00:00");
      if (d.getMonth() === month && d.getFullYear() === year) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push({ name: `📋 ${b.event_name}`, trailerId: b.trailer_id, type: "booking" });
      }
    });
    return map;
  }, [events, bookings, month, year]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-trailer schedule with events and bookings.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold px-3 min-w-[160px] text-center">{monthName}</span>
            <button onClick={nextMonth} className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Trailer Legend */}
        {trailers && trailers.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            {trailers.map((t) => {
              const color = trailerColorMap[t.id];
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${color?.dot || "bg-muted"}`} />
                  <span className="text-xs font-medium text-muted-foreground">{t.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {eventsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map((d) => (
                <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayEvents = day.isCurrentMonth ? (eventsByDay[day.date.toString()] || []) : [];
                const today = new Date();
                const isToday = day.isCurrentMonth && day.date === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-b border-r border-border p-2 ${
                      day.isCurrentMonth ? "bg-card" : "bg-muted/30"
                    }`}
                  >
                    <span className={`text-sm ${
                      isToday ? "font-bold text-primary bg-primary/10 rounded-full w-6 h-6 inline-flex items-center justify-center"
                      : day.isCurrentMonth ? "font-medium text-card-foreground"
                      : "text-muted-foreground/50"
                    }`}>
                      {day.date}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt, j) => {
                        const color = evt.trailerId ? trailerColorMap[evt.trailerId] : null;
                        return (
                          <div
                            key={j}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium truncate ${
                              color ? `${color.bg} ${color.text}` : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {evt.name}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
