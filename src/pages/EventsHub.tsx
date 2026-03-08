import { AppLayout } from "@/components/layout/AppLayout";
import { Sparkles, MapPin, Calendar, Users as UsersIcon, DollarSign, Plus, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useEventsByStage, useEvent, useCreateEvent, useUpdateEvent } from "@/hooks/useEvents";
import { useToggleChecklistItem } from "@/hooks/useChecklist";
import { useTrailers } from "@/hooks/useTrailers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type EventStage = Database["public"]["Enums"]["event_stage"];

const stages: EventStage[] = ["lead", "applied", "tentative", "confirmed", "completed", "closed"];

const stageLabels: Record<EventStage, string> = {
  lead: "Lead",
  applied: "Applied",
  tentative: "Tentative",
  confirmed: "Confirmed",
  completed: "Completed",
  closed: "Closed",
};

const stageColors: Record<EventStage, string> = {
  lead: "border-t-muted-foreground",
  applied: "border-t-info",
  tentative: "border-t-warning",
  confirmed: "border-t-success",
  completed: "border-t-primary",
  closed: "border-t-border",
};

const aiInsights = [
  "Founders Day historically yields 15-20% above forecast. Consider adding a second trailer.",
  "Staff overtime risk: 3 events within 48 hours for Brew Mobile.",
  "Sweet Scoops performs 32% better at festivals vs. corporate events.",
];

function formatRevenue(low?: number | null, high?: number | null, actual?: number | null): string {
  if (actual) return `$${actual.toLocaleString()}`;
  if (low && high) return `$${low.toLocaleString()}–$${high.toLocaleString()}`;
  if (low) return `$${low.toLocaleString()}+`;
  return "—";
}

function formatDate(date?: string | null, endDate?: string | null): string {
  if (!date) return "TBD";
  const d = new Date(date + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = d.toLocaleDateString("en-US", opts);
  if (endDate && endDate !== date) {
    const e = new Date(endDate + "T00:00:00");
    return `${start}–${e.toLocaleDateString("en-US", { day: "numeric" })}`;
  }
  return start;
}

export default function EventsHub() {
  const { data: grouped, isLoading } = useEventsByStage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedEvent } = useEvent(selectedId ?? undefined);
  const { data: trailers } = useTrailers();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const toggleChecklist = useToggleChecklistItem();
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  const handleAddEvent = async () => {
    if (!newEventName.trim()) return;
    try {
      const result = await createEvent.mutateAsync({
        name: newEventName.trim(),
        stage: "lead",
        created_by: user?.id,
      });
      setNewEventName("");
      setShowAddForm(false);
      setSelectedId(result.id);
      toast.success("Event added to pipeline");
    } catch {
      toast.error("Failed to create event");
    }
  };

  const handleStageChange = async (eventId: string, newStage: EventStage) => {
    try {
      await updateEvent.mutateAsync({ id: eventId, stage: newStage });
      toast.success(`Moved to ${stageLabels[newStage]}`);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  // Auto-select first confirmed event if nothing selected
  if (!selectedId && grouped) {
    const firstEvent = grouped.confirmed?.[0] || grouped.lead?.[0] || Object.values(grouped).flat()[0];
    if (firstEvent) {
      setSelectedId(firstEvent.id);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Events Hub</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your event pipeline from discovery to completion.</p>
          </div>
          {showAddForm ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                placeholder="Event name..."
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleAddEvent}
                disabled={createEvent.isPending}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createEvent.isPending ? "Adding..." : "Add"}
              </button>
              <button onClick={() => setShowAddForm(false)} className="text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
            <div className="flex gap-4 min-w-max flex-1">
              {stages.map((stage) => {
                const events = grouped?.[stage] ?? [];
                return (
                  <div key={stage} className="w-[260px] shrink-0">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{stageLabels[stage]}</h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {events.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedId(event.id)}
                          className={`w-full rounded-lg border-t-[3px] ${stageColors[stage]} border border-border bg-card p-3.5 text-left shadow-card hover:shadow-card-hover transition-all ${
                            selectedId === event.id ? "ring-2 ring-primary/30" : ""
                          }`}
                        >
                          <p className="text-sm font-semibold text-card-foreground">{event.name}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.event_date, event.event_end_date)}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.location || "No location"}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-primary">
                              {formatRevenue(event.revenue_forecast_low, event.revenue_forecast_high, event.actual_revenue)}
                            </span>
                            {(event.confidence ?? 0) > 0 && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                (event.confidence ?? 0) >= 80
                                  ? "bg-success/10 text-success"
                                  : (event.confidence ?? 0) >= 60
                                  ? "bg-warning/10 text-warning"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {event.confidence}%
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      {events.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                          No events
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Event Detail + AI Panel */}
        {selectedEvent && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">{selectedEvent.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(selectedEvent.event_date, selectedEvent.event_end_date)} · {selectedEvent.location || "No location"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Stage selector */}
                  <select
                    value={selectedEvent.stage}
                    onChange={(e) => handleStageChange(selectedEvent.id, e.target.value as EventStage)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium outline-none"
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>{stageLabels[s]}</option>
                    ))}
                  </select>
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                    {selectedEvent.confidence ?? 50}% confidence
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "Attendance Est.", value: selectedEvent.attendance_estimate?.toLocaleString() || "—", icon: UsersIcon },
                  { label: "Forecasted Revenue", value: formatRevenue(selectedEvent.revenue_forecast_low, selectedEvent.revenue_forecast_high, selectedEvent.actual_revenue), icon: DollarSign },
                  { label: "Assigned Trailer", value: (selectedEvent as any).trailers?.name || "Unassigned", icon: MapPin },
                  { label: "Risk Level", value: selectedEvent.risk_level || "Low", icon: AlertTriangle },
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

              {/* Vendor Fee */}
              {(selectedEvent.vendor_fee ?? 0) > 0 && (
                <div className="mt-4 rounded-lg bg-background p-3 border border-border">
                  <span className="text-[11px] text-muted-foreground">Vendor Fee</span>
                  <p className="text-sm font-semibold text-card-foreground">${selectedEvent.vendor_fee?.toLocaleString()}</p>
                </div>
              )}

              {/* Checklist */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Event Checklist</h4>
                <div className="space-y-2">
                  {(selectedEvent as any).event_checklist_items?.length > 0 ? (
                    (selectedEvent as any).event_checklist_items
                      .sort((a: any, b: any) => a.sort_order - b.sort_order)
                      .map((item: any) => (
                        <label key={item.id} className="flex items-center gap-3 rounded-lg bg-background border border-border p-3 cursor-pointer hover:shadow-card transition-shadow">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleChecklist.mutate({ id: item.id, completed: !item.completed })}
                            className="rounded border-border text-primary"
                          />
                          <span className={`text-sm ${item.completed ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                            {item.label}
                          </span>
                        </label>
                      ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-3">No checklist items yet. Add them from the database.</p>
                  )}
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
                <p className="text-xs text-primary-foreground/80 mt-1">
                  {trailers && trailers.length >= 2
                    ? `Deploy ${trailers[0]?.name} + ${trailers[1]?.name} for maximum revenue coverage.`
                    : "Add trailers to your fleet to get deployment suggestions."}
                </p>
                <button
                  onClick={() => {
                    if (selectedEvent && trailers && trailers.length > 0) {
                      const trailerId = trailers[0].id;
                      updateEvent.mutate(
                        { id: selectedEvent.id, trailer_id: trailerId },
                        {
                          onSuccess: () => toast.success(`Assigned ${trailers[0].name} to ${selectedEvent.name}`),
                          onError: () => toast.error("Failed to apply suggestion"),
                        }
                      );
                    } else {
                      toast.info("No trailers available to assign");
                    }
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground underline underline-offset-2"
                >
                  Apply Suggestion <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedEvent && !isLoading && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Select an event from the pipeline above, or add a new one to get started.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
