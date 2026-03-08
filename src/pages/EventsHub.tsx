import { AppLayout } from "@/components/layout/AppLayout";
import {
  Sparkles, MapPin, Calendar, Users as UsersIcon, DollarSign, Plus,
  ChevronRight, AlertTriangle, Loader2, Pencil, Search, ExternalLink,
  X, Save, Trash2, Globe, Compass,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { useEventsByStage, useEvent, useCreateEvent, useUpdateEvent, useDeleteEvent, useEvents } from "@/hooks/useEvents";
import { useToggleChecklistItem } from "@/hooks/useChecklist";
import { useTrailers } from "@/hooks/useTrailers";
import { useBookings } from "@/hooks/useBookings";
import { useAuth } from "@/contexts/AuthContext";
import { useAIDiscovery } from "@/hooks/useAIDiscovery";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { claudeNonStreaming } from "@/hooks/useClaudeAI";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type EventStage = Database["public"]["Enums"]["event_stage"];

const stages: EventStage[] = ["lead", "applied", "tentative", "confirmed", "completed", "closed"];

const stageLabels: Record<EventStage, string> = {
  lead: "Lead", applied: "Applied", tentative: "Tentative",
  confirmed: "Confirmed", completed: "Completed", closed: "Closed",
};

const stageColors: Record<EventStage, string> = {
  lead: "border-t-muted-foreground", applied: "border-t-info", tentative: "border-t-warning",
  confirmed: "border-t-success", completed: "border-t-primary", closed: "border-t-border",
};

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
  const { data: allEvents } = useEvents();
  const { data: existingBookings } = useBookings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedEvent } = useEvent(selectedId ?? undefined);
  const { data: trailers } = useTrailers();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const toggleChecklist = useToggleChecklistItem();
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [editing, setEditing] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiCitations, setAiCitations] = useState<string[]>([]);
  const [aiForecastLoading, setAiForecastLoading] = useState(false);
  const [mainTab, setMainTab] = useState<"pipeline" | "discover">("pipeline");

  // Discover state
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | undefined>();
  const [locationFilter, setLocationFilter] = useState("");
  const [radiusMiles, setRadiusMiles] = useState<number>(50);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const { data: aiEvents, isFetching: discoverFetching } = useAIDiscovery(submittedQuery);
  const opportunities = aiEvents || [];

  const busyRanges = useMemo(() => {
    const ranges: { start: string; end: string; name: string }[] = [];
    (allEvents || []).forEach((e) => {
      if (e.event_date) ranges.push({ start: e.event_date, end: e.event_end_date || e.event_date, name: e.name });
    });
    (existingBookings || []).forEach((b) => {
      ranges.push({ start: b.event_date, end: b.event_date, name: b.event_name });
    });
    return ranges;
  }, [allEvents, existingBookings]);

  const getOverlaps = (dateStr: string) => {
    if (!dateStr) return [];
    try {
      const eventDate = new Date(dateStr);
      if (isNaN(eventDate.getTime())) return [];
      return busyRanges.filter((range) => {
        const start = addDays(new Date(range.start), -1);
        const end = addDays(new Date(range.end), 1);
        return eventDate >= start && eventDate <= end;
      });
    } catch { return []; }
  };

  const handleDiscoverSearch = () => {
    const parts: string[] = [];
    if (searchQuery) parts.push(searchQuery);
    if (locationFilter) parts.push(`within ${radiusMiles} miles of ${locationFilter}`);
    if (dateRange.from) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      parts.push(dateRange.to ? `between ${fromStr} and ${format(dateRange.to, "yyyy-MM-dd")}` : `around ${fromStr}`);
    }
    const query = parts.join(" ");
    if (!query) { toast.error("Enter a search term, location, or date range"); return; }
    setSubmittedQuery(query);
  };

  const addToPipeline = (opp: typeof opportunities[0]) => {
    createEvent.mutate(
      { name: opp.name, event_type: opp.type, location: opp.location, stage: "lead", source: "ai-discovery", confidence: opp.aiRank },
      { onSuccess: () => { toast.success(`"${opp.name}" added to pipeline`); setMainTab("pipeline"); }, onError: (e) => toast.error(e.message) }
    );
  };

  // AI Forecast for a single event
  const handleAIForecast = async () => {
    if (!selectedEvent) return;
    setAiForecastLoading(true);
    try {
      const trailerData = trailers?.find(t => t.id === (selectedEvent as any).trailer_id);
      const context = `Calculate revenue forecast for this event:
Event: ${selectedEvent.name}
Type: ${selectedEvent.event_type || "Unknown"}
Location: ${selectedEvent.location || "Unknown"}
Date: ${selectedEvent.event_date || "TBD"}
Attendance: ${selectedEvent.attendance_estimate || "Unknown"}
Start: ${selectedEvent.start_time || "Unknown"}, End: ${selectedEvent.end_time || "Unknown"}
Vendor Fee: $${selectedEvent.vendor_fee || 0}
${trailerData ? `Trailer: ${trailerData.name}, Avg Ticket: $${trailerData.avg_ticket}, Customers/hr: ${trailerData.avg_customers_per_hour}, Food Cost: ${trailerData.avg_food_cost_percent}%, Staff: ${trailerData.staff_required} @ $${trailerData.staff_hourly_rate}/hr, Fuel: $${trailerData.fuel_cost_per_event}` : "No trailer assigned — use industry averages"}

Return ONLY a JSON object with: revenue_forecast_low (number), revenue_forecast_high (number), confidence (0-100), notes (string with profit math). No markdown.`;
      const response = await claudeNonStreaming("forecast", [{ role: "user", content: context }]);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const forecast = JSON.parse(jsonMatch[0]);
        await updateEvent.mutateAsync({
          id: selectedEvent.id,
          revenue_forecast_low: forecast.revenue_forecast_low,
          revenue_forecast_high: forecast.revenue_forecast_high,
          confidence: forecast.confidence,
          notes: selectedEvent.notes ? `${selectedEvent.notes}\n\nAI Forecast: ${forecast.notes}` : `AI Forecast: ${forecast.notes}`,
        });
        toast.success("Revenue forecast generated!");
      } else {
        toast.error("Couldn't parse forecast");
      }
    } catch (e: any) {
      toast.error(e.message || "Forecast failed");
    } finally {
      setAiForecastLoading(false);
    }
  };

  // Edit form state
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const startEditing = () => {
    if (!selectedEvent) return;
    setEditForm({
      name: selectedEvent.name || "",
      location: selectedEvent.location || "",
      address: selectedEvent.address || "",
      event_date: selectedEvent.event_date || "",
      event_end_date: selectedEvent.event_end_date || "",
      start_time: selectedEvent.start_time || "",
      end_time: selectedEvent.end_time || "",
      event_type: selectedEvent.event_type || "",
      attendance_estimate: selectedEvent.attendance_estimate ?? "",
      vendor_fee: selectedEvent.vendor_fee ?? "",
      revenue_forecast_low: selectedEvent.revenue_forecast_low ?? "",
      revenue_forecast_high: selectedEvent.revenue_forecast_high ?? "",
      confidence: selectedEvent.confidence ?? 50,
      description: selectedEvent.description || "",
      notes: selectedEvent.notes || "",
      risk_level: selectedEvent.risk_level || "low",
      trailer_id: (selectedEvent as any).trailer_id || "",
    });
    setEditing(true);
    setAiCitations([]);
  };

  const saveEdit = async () => {
    if (!selectedEvent) return;
    try {
      const updates: any = { id: selectedEvent.id };
      Object.entries(editForm).forEach(([key, value]) => {
        if (value === "") {
          updates[key] = null;
        } else if (["attendance_estimate", "vendor_fee", "revenue_forecast_low", "revenue_forecast_high", "confidence"].includes(key)) {
          updates[key] = value ? Number(value) : null;
        } else {
          updates[key] = value;
        }
      });
      await updateEvent.mutateAsync(updates);
      setEditing(false);
      toast.success("Event updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!confirm(`Delete "${selectedEvent.name}"? This cannot be undone.`)) return;
    try {
      await deleteEvent.mutateAsync(selectedEvent.id);
      setSelectedId(null);
      setEditing(false);
      toast.success("Event deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAISearch = async () => {
    const eventName = editing ? editForm.name : selectedEvent?.name;
    if (!eventName) return;
    setAiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-event", {
        body: { eventName, location: editing ? editForm.location : selectedEvent?.location },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.eventData) {
        const ed = data.eventData;
        setEditForm((prev: Record<string, any>) => ({
          ...prev,
          ...(ed.name && { name: ed.name }),
          ...(ed.location && { location: ed.location }),
          ...(ed.address && { address: ed.address }),
          ...(ed.event_date && { event_date: ed.event_date }),
          ...(ed.event_end_date && { event_end_date: ed.event_end_date }),
          ...(ed.start_time && { start_time: ed.start_time }),
          ...(ed.end_time && { end_time: ed.end_time }),
          ...(ed.event_type && { event_type: ed.event_type }),
          ...(ed.attendance_estimate && { attendance_estimate: ed.attendance_estimate }),
          ...(ed.vendor_fee && { vendor_fee: ed.vendor_fee }),
          ...(ed.description && { description: ed.description }),
          ...(ed.notes && prev.notes ? { notes: prev.notes + "\n\n" + ed.notes } : ed.notes ? { notes: ed.notes } : {}),
        }));
        if (data.citations?.length) setAiCitations(data.citations);
        if (!editing) startEditing();
        toast.success("AI found event details! Review and save.");
      } else {
        toast.info("AI couldn't find specific details for this event.");
      }
    } catch (e: any) {
      toast.error(e.message || "AI search failed");
    } finally {
      setAiSearching(false);
    }
  };

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

  // Auto-select first event if nothing selected
  if (!selectedId && grouped) {
    const firstEvent = grouped.confirmed?.[0] || grouped.lead?.[0] || Object.values(grouped).flat()[0];
    if (firstEvent) setSelectedId(firstEvent.id);
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Events</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your event pipeline and discover new opportunities.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              <button
                onClick={() => setMainTab("pipeline")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mainTab === "pipeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" /> Pipeline
              </button>
              <button
                onClick={() => setMainTab("discover")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mainTab === "discover" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Compass className="h-3 w-3" /> Discover
              </button>
            </div>
            {mainTab === "pipeline" && (
              showAddForm ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                    placeholder="Event name..."
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button onClick={handleAddEvent} disabled={createEvent.isPending} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {createEvent.isPending ? "Adding..." : "Add"}
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Plus className="h-4 w-4" /> Add Event
                </button>
              )
            )}
          </div>
        </div>

        {/* ══════════ DISCOVER TAB ══════════ */}
        {mainTab === "discover" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 flex-1 max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDiscoverSearch()}
                  placeholder="Search events, types..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 min-w-[200px]">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="City, State"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("min-w-[180px] justify-start text-left font-normal text-sm h-[38px]", !dateRange.from && "text-muted-foreground")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d")}</> : format(dateRange.from, "MMM d, yyyy")) : "Date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="range" selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} disabled={(date) => date < new Date()} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden">
                {[10, 25, 50, 100].map((r) => (
                  <button key={r} onClick={() => setRadiusMiles(r)} className={`px-3 py-2 text-xs font-medium transition-colors border-r border-border last:border-r-0 ${radiusMiles === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                    {r}mi
                  </button>
                ))}
              </div>
              <button onClick={handleDiscoverSearch} disabled={discoverFetching} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {discoverFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI Search
              </button>
            </div>

            {discoverFetching && (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">AI is finding events for your trailers...</span>
              </div>
            )}

            {!submittedQuery && !discoverFetching && opportunities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 text-primary/30" />
                <p className="text-base font-bold text-card-foreground">Find events perfect for your trailers</p>
                <p className="text-sm mt-1 text-center max-w-md">Enter your location, pick a date range, and click AI Search to discover profitable events.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {opportunities.map((opp, idx) => {
                const overlaps = getOverlaps(opp.date);
                const hasOverlap = overlaps.length > 0;
                return (
                  <div key={`${opp.name}-${idx}`} className={cn("rounded-xl border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow", hasOverlap ? "border-warning/50" : "border-border")}>
                    {hasOverlap && (
                      <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3 mb-4">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-warning">Schedule Conflict</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Overlaps with: {overlaps.map(o => o.name).join(", ")}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{opp.name}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> {opp.date}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {opp.location}</div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-xs font-bold text-primary">{opp.aiRank}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-background border border-border p-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Profit Estimate</p>
                        <p className="text-sm font-semibold text-card-foreground">{opp.profitEstimate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">Attendance</p>
                        <p className="text-sm font-semibold text-card-foreground">{opp.attendance}</p>
                      </div>
                    </div>
                    {opp.reasoning && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{opp.reasoning}</p>}
                    <div className="mt-4 flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{opp.type}</span>
                      <div className="flex-1" />
                      <button onClick={() => addToPipeline(opp)} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", hasOverlap ? "bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                        <Plus className="h-3 w-3" /> {hasOverlap ? "Add Anyway" : "Add to Pipeline"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ PIPELINE TAB ══════════ */}
        {mainTab === "pipeline" && (
          <>
        {/* Pipeline Kanban */}
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
                          onClick={() => { setSelectedId(event.id); setEditing(false); }}
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
                                (event.confidence ?? 0) >= 80 ? "bg-success/10 text-success"
                                : (event.confidence ?? 0) >= 60 ? "bg-warning/10 text-warning"
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

        {/* Selected Event Detail */}
        {selectedEvent && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
              {/* Header with actions */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1">
                  {editing ? (
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-lg font-bold mb-1"
                    />
                  ) : (
                    <h2 className="text-lg font-bold text-card-foreground">{selectedEvent.name}</h2>
                  )}
                  {!editing && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatDate(selectedEvent.event_date, selectedEvent.event_end_date)} · {selectedEvent.location || "No location"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* AI Search */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAISearch}
                    disabled={aiSearching}
                    className="gap-1.5"
                  >
                    {aiSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                    {aiSearching ? "Searching..." : "AI Search"}
                  </Button>
                  {editing ? (
                    <>
                      <Button size="sm" onClick={saveEdit} disabled={updateEvent.isPending} className="gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        {updateEvent.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <select
                        value={selectedEvent.stage}
                        onChange={(e) => handleStageChange(selectedEvent.id, e.target.value as EventStage)}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium outline-none"
                      >
                        {stages.map((s) => (
                          <option key={s} value={s}>{stageLabels[s]}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>

              {/* Editing Form */}
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Location (City, State)</label>
                      <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Address</label>
                      <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                      <Input type="date" value={editForm.event_date} onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">End Date</label>
                      <Input type="date" value={editForm.event_end_date} onChange={(e) => setEditForm({ ...editForm, event_end_date: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                      <Input type="time" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">End Time</label>
                      <Input type="time" value={editForm.end_time} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Event Type</label>
                      <Input value={editForm.event_type} onChange={(e) => setEditForm({ ...editForm, event_type: e.target.value })} placeholder="festival, market, corporate..." className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Attendance Estimate</label>
                      <Input type="number" value={editForm.attendance_estimate} onChange={(e) => setEditForm({ ...editForm, attendance_estimate: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Vendor Fee ($)</label>
                      <Input type="number" step="0.01" value={editForm.vendor_fee} onChange={(e) => setEditForm({ ...editForm, vendor_fee: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Confidence (%)</label>
                      <Input type="number" min="0" max="100" value={editForm.confidence} onChange={(e) => setEditForm({ ...editForm, confidence: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Revenue Forecast Low ($)</label>
                      <Input type="number" step="0.01" value={editForm.revenue_forecast_low} onChange={(e) => setEditForm({ ...editForm, revenue_forecast_low: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Revenue Forecast High ($)</label>
                      <Input type="number" step="0.01" value={editForm.revenue_forecast_high} onChange={(e) => setEditForm({ ...editForm, revenue_forecast_high: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Risk Level</label>
                      <select
                        value={editForm.risk_level}
                        onChange={(e) => setEditForm({ ...editForm, risk_level: e.target.value })}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Assigned Trailer</label>
                      <select
                        value={editForm.trailer_id}
                        onChange={(e) => setEditForm({ ...editForm, trailer_id: e.target.value })}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Unassigned</option>
                        {trailers?.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Notes</label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="mt-1" />
                  </div>

                  {/* AI Citations */}
                  {aiCitations.length > 0 && (
                    <div className="rounded-lg bg-info/5 border border-info/20 p-3">
                      <p className="text-xs font-semibold text-info mb-2 flex items-center gap-1.5">
                        <Globe className="h-3 w-3" /> Sources
                      </p>
                      <div className="space-y-1">
                        {aiCitations.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-info hover:underline truncate">
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={saveEdit} disabled={updateEvent.isPending} className="gap-1.5">
                      <Save className="h-4 w-4" />
                      {updateEvent.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    <div className="flex-1" />
                    <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Read-only detail cards */}
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

                  {selectedEvent.description && (
                    <div className="mt-4 rounded-lg bg-background border border-border p-3">
                      <span className="text-[11px] text-muted-foreground">Description</span>
                      <p className="text-sm text-card-foreground mt-1">{selectedEvent.description}</p>
                    </div>
                  )}

                  {(selectedEvent.vendor_fee ?? 0) > 0 && (
                    <div className="mt-4 rounded-lg bg-background p-3 border border-border">
                      <span className="text-[11px] text-muted-foreground">Vendor Fee</span>
                      <p className="text-sm font-semibold text-card-foreground">${selectedEvent.vendor_fee?.toLocaleString()}</p>
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div className="mt-4 rounded-lg bg-background border border-border p-3">
                      <span className="text-[11px] text-muted-foreground">Notes</span>
                      <p className="text-sm text-card-foreground mt-1 whitespace-pre-wrap">{selectedEvent.notes}</p>
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
                        <p className="text-xs text-muted-foreground py-3">No checklist items yet.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* AI Insights & Forecast Panel */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">Forecast & Insights</h3>
              </div>

              {/* Revenue Forecast */}
              {(selectedEvent.revenue_forecast_low || selectedEvent.revenue_forecast_high) ? (
                <div className="rounded-lg bg-success/5 border border-success/20 p-3.5">
                  <p className="text-[11px] font-medium text-success mb-1">Projected Revenue</p>
                  <p className="text-lg font-bold text-card-foreground">
                    {formatRevenue(selectedEvent.revenue_forecast_low, selectedEvent.revenue_forecast_high, selectedEvent.actual_revenue)}
                  </p>
                  {selectedEvent.vendor_fee ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      After vendor fee (${selectedEvent.vendor_fee.toLocaleString()}): <strong className="text-card-foreground">
                        ${((selectedEvent.revenue_forecast_low || 0) - selectedEvent.vendor_fee).toLocaleString()}–${((selectedEvent.revenue_forecast_high || 0) - selectedEvent.vendor_fee).toLocaleString()}
                      </strong> net
                    </p>
                  ) : null}
                  {selectedEvent.attendance_estimate ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      ~${((selectedEvent.revenue_forecast_low || 0) / selectedEvent.attendance_estimate).toFixed(2)}-${((selectedEvent.revenue_forecast_high || 0) / selectedEvent.attendance_estimate).toFixed(2)} rev/attendee
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg bg-background border border-border p-3.5 space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    No forecast yet. Click below to generate one with AI, or manually enter estimates by clicking Edit.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleAIForecast}
                    disabled={aiForecastLoading}
                    className="w-full gap-1.5"
                  >
                    {aiForecastLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {aiForecastLoading ? "Calculating..." : "AI Generate Forecast"}
                  </Button>
                </div>
              )}

              {/* Confidence meter */}
              {(selectedEvent.confidence ?? 0) > 0 && (
                <div className="rounded-lg bg-background border border-border p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-muted-foreground">Confidence Score</p>
                    <span className={`text-sm font-bold ${
                      (selectedEvent.confidence ?? 0) >= 80 ? "text-success"
                      : (selectedEvent.confidence ?? 0) >= 50 ? "text-warning"
                      : "text-destructive"
                    }`}>{selectedEvent.confidence}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (selectedEvent.confidence ?? 0) >= 80 ? "bg-success"
                        : (selectedEvent.confidence ?? 0) >= 50 ? "bg-warning"
                        : "bg-destructive"
                      }`}
                      style={{ width: `${selectedEvent.confidence}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Event summary */}
              {selectedEvent.event_type && (
                <div className="rounded-lg bg-background border border-border p-3.5">
                  <p className="text-sm text-card-foreground leading-relaxed">
                    <strong>{selectedEvent.event_type}</strong> event
                    {selectedEvent.attendance_estimate ? ` · ~${selectedEvent.attendance_estimate.toLocaleString()} attendees` : ""}
                    {selectedEvent.vendor_fee ? ` · $${selectedEvent.vendor_fee.toLocaleString()} fee` : ""}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="rounded-lg gradient-warm p-4">
                <p className="text-sm font-medium text-primary-foreground">Quick Actions</p>
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => { if (!editing) startEditing(); }}
                    className="w-full inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground underline underline-offset-2"
                  >
                    <Pencil className="h-3 w-3" /> Edit Event Details
                  </button>
                  <button
                    onClick={handleAISearch}
                    disabled={aiSearching}
                    className="w-full inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground underline underline-offset-2"
                  >
                    <Globe className="h-3 w-3" /> {aiSearching ? "Searching..." : "Search Web for Event Data"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedEvent && !isLoading && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Select an event from the pipeline above, or add a new one to get started.</p>
          </div>
        )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
