import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Truck, Calendar, Clock, Users, DollarSign, ChevronLeft, ChevronRight, Loader2, Check, MapPin, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PublicBooking() {
  const [searchParams] = useSearchParams();
  const preselectedTrailerId = searchParams.get("trailer");

  // Fetch trailers (public - RLS allows SELECT for all)
  const { data: trailers, isLoading: trailersLoading } = useQuery({
    queryKey: ["public-trailers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trailers")
        .select("id, name, type, description, specialties, image_url, status, avg_ticket, avg_customers_per_hour, avg_food_cost_percent, staff_required, setup_teardown_hours, org_id")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing events + bookings for availability
  const { data: events } = useQuery({
    queryKey: ["public-events-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("event_date, event_end_date, trailer_id, name").not("event_date", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["public-bookings-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("event_date, trailer_id, event_name, status").neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
  });

  const [selectedTrailer, setSelectedTrailer] = useState<string>(preselectedTrailerId || "");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [step, setStep] = useState<"select" | "form" | "success">("select");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    client_name: "", client_email: "", client_phone: "", event_name: "",
    location: "", guest_count: "", service_package: "", notes: "",
    start_time: "", end_time: "", event_type: "", budget_range: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Build busy dates for selected trailer
  const busyDates = useMemo(() => {
    const set = new Set<string>();
    if (!selectedTrailer) return set;
    events?.forEach(e => {
      if (e.trailer_id === selectedTrailer && e.event_date) {
        set.add(e.event_date);
        if (e.event_end_date) {
          const start = new Date(e.event_date + "T00:00:00");
          const end = new Date(e.event_end_date + "T00:00:00");
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            set.add(d.toISOString().split("T")[0]);
          }
        }
      }
    });
    bookings?.forEach(b => {
      if (b.trailer_id === selectedTrailer) set.add(b.event_date);
    });
    return set;
  }, [selectedTrailer, events, bookings]);

  // Calendar days
  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: number; month: number; year: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month - 1;
      result.push({ date: d, month: m, year, isCurrentMonth: false, dateStr: `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ date: d, month, year, isCurrentMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }
    while (result.length < 42) {
      const d = result.length - firstDay - daysInMonth + 1;
      const m = month + 1;
      result.push({ date: d, month: m, year, isCurrentMonth: false, dateStr: `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }
    return result;
  }, [year, month]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const trailer = trailers?.find(t => t.id === selectedTrailer);

  // Pricing estimate — uses guest count as primary driver when available
  const getPricingEstimate = () => {
    if (!trailer) return null;
    const ticket = Number(trailer.avg_ticket) || 0;
    if (!ticket) return null;

    const guests = parseInt(form.guest_count) || 0;
    const custPerHr = Number(trailer.avg_customers_per_hour) || 0;
    const hours = form.start_time && form.end_time
      ? Math.max(1, (parseInt(form.end_time.split(":")[0]) * 60 + parseInt(form.end_time.split(":")[1]) - parseInt(form.start_time.split(":")[0]) * 60 - parseInt(form.start_time.split(":")[1])) / 60)
      : 0;

    if (guests > 0) {
      // Guest-based: assume ~60-80% of guests buy, at avg ticket
      const estimatedBuyers = guests * 0.7;
      const baseRevenue = estimatedBuyers * ticket;
      return { min: Math.round(baseRevenue * 0.75), max: Math.round(baseRevenue * 1.2), typical: Math.round(baseRevenue), basis: "guest count" as const };
    }

    if (hours > 0 && custPerHr > 0) {
      // Time-based fallback
      const revenue = ticket * custPerHr * hours;
      return { min: Math.round(revenue * 0.6), max: Math.round(revenue * 1.1), typical: Math.round(revenue * 0.85), basis: "event duration" as const };
    }

    return null;
  };

  const pricing = getPricingEstimate();

  const handleSubmit = async () => {
    if (!form.client_name || !form.client_email || !form.event_name || !selectedDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      // Derive org_id from the selected trailer
      const trailerObj = trailers?.find(t => t.id === selectedTrailer);
      const { error } = await supabase.from("bookings").insert({
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone || null,
        event_name: form.event_name,
        event_date: selectedDate,
        location: form.location || null,
        trailer_id: selectedTrailer || null,
        service_package: form.service_package || null,
        guest_count: form.guest_count ? parseInt(form.guest_count) : null,
        notes: [form.event_type && `Event type: ${form.event_type}`, form.budget_range && `Budget: ${form.budget_range}`, form.notes].filter(Boolean).join("\n") || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        status: "pending",
        total_price: pricing?.typical || null,
        org_id: (trailerObj as any)?.org_id || null,
      });
      if (error) throw error;
      setStep("success");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (trailersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Booking Request Sent!</h1>
          <p className="text-muted-foreground">
            Thank you, {form.client_name}! We've received your booking request for <strong>{form.event_name}</strong> on <strong>{selectedDate}</strong>.
            We'll be in touch at <strong>{form.client_email}</strong> within 24 hours to confirm details and discuss pricing.
          </p>
          <Button onClick={() => { setStep("select"); setSelectedDate(""); setForm({ client_name: "", client_email: "", client_phone: "", event_name: "", location: "", guest_count: "", service_package: "", notes: "", start_time: "", end_time: "", event_type: "", budget_range: "" }); }}>
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Book a Trailer</h1>
              <p className="text-sm text-muted-foreground">Check availability & request your event</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* Step 1: Select Trailer */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">1. Choose a Trailer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trailers?.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTrailer(t.id); setSelectedDate(""); }}
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  selectedTrailer === t.id
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.type || "Food Trailer"}</p>
                    {t.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.description}</p>}
                    {t.specialties && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.specialties.split(",").map(s => (
                          <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTrailer === t.id && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Pick Date */}
        {selectedTrailer && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">2. Pick a Date</h2>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold">{monthName}</span>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 border-b border-border">
                {weekDays.map(d => (
                  <div key={d} className="px-1 py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, i) => {
                  const isBusy = busyDates.has(day.dateStr);
                  const isPast = day.dateStr < todayStr;
                  const isSelected = day.dateStr === selectedDate;
                  const isToday = day.dateStr === todayStr;
                  const isClickable = day.isCurrentMonth && !isBusy && !isPast;

                  return (
                    <button
                      key={i}
                      disabled={!isClickable}
                      onClick={() => isClickable && setSelectedDate(day.dateStr)}
                      className={`min-h-[48px] sm:min-h-[56px] border-b border-r border-border p-1.5 text-sm transition-all ${
                        !day.isCurrentMonth ? "text-muted-foreground/30 bg-muted/20"
                        : isPast ? "text-muted-foreground/40 bg-muted/10 cursor-not-allowed"
                        : isBusy ? "bg-destructive/5 text-destructive/50 cursor-not-allowed"
                        : isSelected ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-primary/10 cursor-pointer text-foreground"
                      }`}
                    >
                      <span className={`${isToday && !isSelected ? "font-bold text-primary underline" : ""}`}>
                        {day.date}
                      </span>
                      {isBusy && day.isCurrentMonth && (
                        <div className="text-[9px] text-destructive font-medium mt-0.5">Booked</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedDate && (
              <p className="mt-3 text-sm text-success font-medium flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Selected: {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </section>
        )}

        {/* Step 3: Event Details + Pricing */}
        {selectedDate && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">3. Event Details</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Your Name *</label>
                    <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Jane Smith" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email *</label>
                    <Input type="email" value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} placeholder="jane@example.com" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                    <Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} placeholder="(555) 123-4567" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Event Name *</label>
                    <Input value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} placeholder="Sarah's Birthday Party" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="123 Main St, Anytown OH" className="mt-1" />
                  </div>
                   <div>
                    <label className="text-xs font-medium text-muted-foreground">Estimated Guests *</label>
                    <Input type="number" value={form.guest_count} onChange={e => setForm({ ...form, guest_count: e.target.value })} placeholder="50" className="mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-1">Used to calculate your pricing estimate</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Event Type</label>
                    <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                      <option value="">Select type...</option>
                      <option value="birthday">Birthday Party</option>
                      <option value="wedding">Wedding / Reception</option>
                      <option value="corporate">Corporate Event</option>
                      <option value="festival">Festival / Fair</option>
                      <option value="school">School / Church Event</option>
                      <option value="fundraiser">Fundraiser</option>
                      <option value="neighborhood">Block Party / Neighborhood</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                    <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">End Time</label>
                    <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Budget Range</label>
                    <select value={form.budget_range} onChange={e => setForm({ ...form, budget_range: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                      <option value="">Select range...</option>
                      <option value="under_500">Under $500</option>
                      <option value="500_1000">$500 – $1,000</option>
                      <option value="1000_2000">$1,000 – $2,000</option>
                      <option value="2000_5000">$2,000 – $5,000</option>
                      <option value="5000_plus">$5,000+</option>
                      <option value="flexible">Flexible / Not Sure</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Package</label>
                    <Input value={form.service_package} onChange={e => setForm({ ...form, service_package: e.target.value })} placeholder="e.g. Premium Sundae Bar" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Additional Notes</label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Anything else we should know? Dietary restrictions, theme, etc." className="mt-1" />
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2" size="lg">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting ? "Submitting..." : "Submit Booking Request"}
                </Button>
              </div>

              {/* Pricing sidebar */}
              <div className="space-y-4">
                {trailer && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">{trailer.name}</h3>
                    </div>
                    {trailer.specialties && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {trailer.specialties.split(",").map(s => (
                          <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">{s.trim()}</span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      {form.start_time && form.end_time && (() => {
                        const hrs = Math.max(1, (parseInt(form.end_time.split(":")[0]) * 60 + parseInt(form.end_time.split(":")[1]) - parseInt(form.start_time.split(":")[0]) * 60 - parseInt(form.start_time.split(":")[1])) / 60);
                        return <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {form.start_time} – {form.end_time} ({hrs.toFixed(1)}h)</div>;
                      })()}
                      {form.guest_count && (
                        <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> ~{form.guest_count} guests</div>
                      )}
                      {form.location && (
                        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {form.location}</div>
                      )}
                    </div>
                  </div>
                )}

                {pricing && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Pricing Estimate</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Based on {pricing.basis === "guest count" ? `~${form.guest_count} guests` : "event duration"}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estimated Range</span>
                        <span className="font-bold text-foreground">${pricing.min} – ${pricing.max}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Typical Price</span>
                        <span className="font-bold text-primary text-lg">${pricing.typical}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">* Estimate based on your {pricing.basis} and our average service rates. Final pricing confirmed after review.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
