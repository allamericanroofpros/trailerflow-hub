import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTrailers } from "@/hooks/useTrailers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, ExternalLink, Smartphone, MapPin, CalendarX } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function OnlineOrdering() {
  const { data: trailers = [], isLoading, refetch } = useTrailers();
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>("");
  const trailer = useMemo(
    () => trailers.find((t: any) => t.id === selectedTrailerId),
    [trailers, selectedTrailerId]
  );

  useEffect(() => {
    if (!selectedTrailerId && trailers.length) setSelectedTrailerId(trailers[0].id);
  }, [trailers, selectedTrailerId]);

  const [booking, setBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  useEffect(() => {
    if (!trailer) return;
    setLoadingBooking(true);
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, event_name, location, start_time, end_time, status")
        .eq("trailer_id", trailer.id)
        .eq("event_date", today())
        .in("status", ["confirmed", "pending"])
        .order("start_time", { ascending: true })
        .limit(1);
      setBooking(data?.[0] ?? null);
      setLoadingBooking(false);
    })();
  }, [trailer]);

  const setOrderingEnabled = async (val: boolean) => {
    if (!trailer) return;
    const { error } = await supabase
      .from("trailers")
      .update({ online_ordering_enabled: val })
      .eq("id", trailer.id);
    if (error) return toast.error(error.message);
    toast.success(val ? "Online ordering enabled" : "Online ordering disabled");
    refetch();
  };

  const setForceClosed = async (val: boolean) => {
    if (!trailer) return;
    const { error } = await supabase
      .from("trailers")
      .update({ online_ordering_force_closed: val })
      .eq("id", trailer.id);
    if (error) return toast.error(error.message);
    toast.success(val ? "Ordering force-closed" : "Force-close cleared");
    refetch();
  };

  const t = trailer as any;
  const enabled = !!t?.online_ordering_enabled;
  const forceClosed = !!t?.online_ordering_force_closed;
  const hasSchedule = !!booking?.location;
  const live = enabled && !forceClosed && hasSchedule;

  const publicUrl = t?.slug ? `${window.location.origin}/order/${t.slug}` : "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Online Ordering</h1>
          <p className="text-sm text-muted-foreground">
            The ordering page goes live automatically when a trailer has a booking scheduled for today.
            Location and pickup window come straight from the schedule — nothing to set manually.
          </p>
        </div>

        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : trailers.length === 0 ? (
          <Card className="p-6">Add a trailer first to enable online ordering.</Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {trailers.map((tr: any) => (
                <Button
                  key={tr.id}
                  variant={tr.id === selectedTrailerId ? "default" : "outline"}
                  onClick={() => setSelectedTrailerId(tr.id)}
                  size="sm"
                >
                  {tr.name}
                </Button>
              ))}
            </div>

            {trailer && (
              <>
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Online ordering for {t.name}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Master switch. Off = the page is hidden / closed regardless of schedule.
                      </p>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setOrderingEnabled} />
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t pt-4">
                    <div>
                      <Label htmlFor="fc" className="font-semibold">Force-close today</Label>
                      <p className="text-xs text-muted-foreground">
                        Sold out, weather, etc. Overrides today's schedule.
                      </p>
                    </div>
                    <Switch id="fc" checked={forceClosed} onCheckedChange={setForceClosed} />
                  </div>

                  {publicUrl && (
                    <div className="flex items-center gap-2 text-sm border-t pt-4">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1">{publicUrl}</code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(publicUrl);
                          toast.success("Link copied");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={publicUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <h2 className="font-semibold mb-3">Today's schedule ({today()})</h2>
                  {loadingBooking ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : booking ? (
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">{booking.event_name}</div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {booking.location || "No location set on booking"}
                      </div>
                      {(booking.start_time || booking.end_time) && (
                        <div className="text-muted-foreground">
                          {booking.start_time?.slice(0, 5) ?? "?"} – {booking.end_time?.slice(0, 5) ?? "?"}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarX className="h-4 w-4" /> No booking scheduled today.
                    </div>
                  )}

                  <div className="mt-4 rounded border p-3 text-sm">
                    Status:{" "}
                    {!enabled ? (
                      <span className="font-semibold text-muted-foreground">Disabled</span>
                    ) : forceClosed ? (
                      <span className="font-semibold text-destructive">Force-closed</span>
                    ) : !hasSchedule ? (
                      <span className="font-semibold text-muted-foreground">Closed — no booking today</span>
                    ) : (
                      <span className="font-semibold text-primary">Live — accepting orders</span>
                    )}
                    {live && booking?.location && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Pickup at {booking.location}
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
