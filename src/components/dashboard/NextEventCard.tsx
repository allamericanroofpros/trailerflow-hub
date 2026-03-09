import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEventsByStage } from "@/hooks/useEvents";
import { CalendarDays, MapPin, Clock, ArrowRight, Sparkles } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";

/** Shows the next upcoming event with key details */
export function NextEventCard() {
  const navigate = useNavigate();
  const { data: grouped } = useEventsByStage();

  const nextEvent = useMemo(() => {
    if (!grouped) return null;
    const now = new Date();
    const upcoming = [...(grouped.confirmed || []), ...(grouped.tentative || [])]
      .filter(e => e.event_date && new Date(e.event_date) >= now)
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
    return upcoming[0] || null;
  }, [grouped]);

  if (!nextEvent) {
    return (
      <button
        onClick={() => navigate("/events")}
        className="rounded-xl border border-dashed border-border bg-card/50 p-5 text-left w-full hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">No upcoming events</p>
            <p className="text-xs text-muted-foreground">Tap to browse or add events to your pipeline</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
        </div>
      </button>
    );
  }

  const eventDate = new Date(nextEvent.event_date!);
  const daysAway = differenceInDays(eventDate, new Date());
  const dateLabel = isToday(eventDate)
    ? "Today"
    : isTomorrow(eventDate)
    ? "Tomorrow"
    : `${format(eventDate, "EEE, MMM d")} · ${daysAway}d away`;

  const avgForecast = ((nextEvent.revenue_forecast_low || 0) + (nextEvent.revenue_forecast_high || 0)) / 2;

  return (
    <button
      onClick={() => navigate("/events")}
      className="rounded-xl border border-border bg-card p-5 shadow-card text-left w-full hover:shadow-card-hover transition-shadow"
    >
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Next Event</span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
          isToday(eventDate) ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
        }`}>
          {dateLabel}
        </span>
      </div>

      <h3 className="text-base font-bold text-card-foreground mb-2 truncate">{nextEvent.name}</h3>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {nextEvent.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {nextEvent.location}
          </span>
        )}
        {nextEvent.start_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {nextEvent.start_time}
            {nextEvent.end_time && ` – ${nextEvent.end_time}`}
          </span>
        )}
        {avgForecast > 0 && (
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> ~${avgForecast.toFixed(0)} forecast
          </span>
        )}
      </div>
    </button>
  );
}
