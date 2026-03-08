import { Bell, Calendar, Wrench, ClipboardList, Users, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, addDays, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: "booking" | "event" | "maintenance" | "staff";
  title: string;
  message: string;
  time: string;
  read: boolean;
  href?: string;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch upcoming events (next 7 days)
  const { data: upcomingEvents } = useQuery({
    queryKey: ["notifications_events"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const next7 = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const { data } = await supabase
        .from("events")
        .select("id, name, event_date, stage")
        .gte("event_date", today)
        .lte("event_date", next7)
        .in("stage", ["confirmed", "tentative"])
        .order("event_date")
        .limit(10);
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch pending bookings
  const { data: pendingBookings } = useQuery({
    queryKey: ["notifications_bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, event_name, client_name, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch overdue/pending maintenance
  const { data: maintenanceAlerts } = useQuery({
    queryKey: ["notifications_maintenance"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("maintenance_records")
        .select("id, title, due_date, status")
        .eq("status", "pending")
        .lte("due_date", today)
        .order("due_date")
        .limit(5);
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Build notifications
  const notifications: Notification[] = [];

  pendingBookings?.forEach((b) => {
    notifications.push({
      id: `booking-${b.id}`,
      type: "booking",
      title: "New Booking Request",
      message: `${b.client_name} — ${b.event_name}`,
      time: "Pending",
      read: false,
      href: "/bookings",
    });
  });

  upcomingEvents?.forEach((e) => {
    const eventDate = e.event_date ? parseISO(e.event_date) : null;
    const daysAway = eventDate ? Math.ceil((eventDate.getTime() - Date.now()) / 86400000) : null;
    notifications.push({
      id: `event-${e.id}`,
      type: "event",
      title: daysAway !== null && daysAway <= 1 ? "Event Tomorrow!" : "Upcoming Event",
      message: `${e.name}${e.event_date ? ` — ${format(parseISO(e.event_date), "MMM d")}` : ""}`,
      time: daysAway !== null ? (daysAway <= 0 ? "Today" : `${daysAway}d away`) : "",
      read: false,
      href: "/events",
    });
  });

  maintenanceAlerts?.forEach((m) => {
    notifications.push({
      id: `maint-${m.id}`,
      type: "maintenance",
      title: "Overdue Maintenance",
      message: m.title,
      time: m.due_date ? format(parseISO(m.due_date), "MMM d") : "",
      read: false,
      href: "/maintenance",
    });
  });

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const count = visible.length;

  const iconMap = {
    booking: ClipboardList,
    event: Calendar,
    maintenance: Wrench,
    staff: Users,
  };

  const colorMap = {
    booking: "text-primary bg-primary/10",
    event: "text-info bg-info/10",
    maintenance: "text-destructive bg-destructive/10",
    staff: "text-warning bg-warning/10",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Notifications</h3>
            {visible.length > 0 && (
              <button
                onClick={() => setDismissed(new Set(notifications.map((n) => n.id)))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              visible.map((n) => {
                const Icon = iconMap[n.type];
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (n.href) navigate(n.href);
                      setOpen(false);
                    }}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorMap[n.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-card-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissed((prev) => new Set([...prev, n.id]));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
