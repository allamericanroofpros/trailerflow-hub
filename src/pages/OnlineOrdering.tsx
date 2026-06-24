import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTrailers } from "@/hooks/useTrailers";
import { useOrgId } from "@/hooks/useOrgId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, ExternalLink, Smartphone } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function OnlineOrdering() {
  const orgId = useOrgId();
  const { data: trailers = [], isLoading } = useTrailers();
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>("");
  const trailer = useMemo(
    () => trailers.find((t: any) => t.id === selectedTrailerId),
    [trailers, selectedTrailerId]
  );

  useEffect(() => {
    if (!selectedTrailerId && trailers.length) setSelectedTrailerId(trailers[0].id);
  }, [trailers, selectedTrailerId]);

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [setupRow, setSetupRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [orderingEnabled, setOrderingEnabled] = useState(false);
  const [availableIds, setAvailableIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!trailer) return;
    setLoading(true);
    (async () => {
      const [{ data: items }, { data: setup }] = await Promise.all([
        supabase
          .from("menu_items")
          .select("id, name, price, category, is_active, trailer_id")
          .eq("org_id", orgId!)
          .or(`trailer_id.eq.${trailer.id},trailer_id.is.null`)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("trailer_daily_setup")
          .select("*")
          .eq("trailer_id", trailer.id)
          .eq("setup_date", today())
          .maybeSingle(),
      ]);
      setMenuItems(items ?? []);
      setSetupRow(setup ?? null);
      setLocation(setup?.location ?? "");
      setNote(setup?.note ?? "");
      setOpensAt(setup?.opens_at ?? "");
      setClosesAt(setup?.closes_at ?? "");
      setOrderingEnabled(!!setup?.ordering_enabled);
      setAvailableIds(new Set(setup?.available_menu_item_ids ?? []));
      setLoading(false);
    })();
  }, [trailer, orgId]);

  const toggleItem = (id: string) => {
    setAvailableIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!trailer || !orgId) return;
    setSaving(true);
    const payload = {
      org_id: orgId,
      trailer_id: trailer.id,
      setup_date: today(),
      location: location || null,
      note: note || null,
      opens_at: opensAt || null,
      closes_at: closesAt || null,
      ordering_enabled: orderingEnabled,
      available_menu_item_ids: Array.from(availableIds),
    };
    const { error } = await supabase
      .from("trailer_daily_setup")
      .upsert(payload, { onConflict: "trailer_id,setup_date" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Today's ordering page updated");
  };

  const toggleTrailerOnline = async (val: boolean) => {
    if (!trailer) return;
    const { error } = await supabase
      .from("trailers")
      .update({ online_ordering_enabled: val })
      .eq("id", trailer.id);
    if (error) return toast.error(error.message);
    toast.success(val ? "Online ordering enabled for this trailer" : "Online ordering disabled");
    // refetch on save will reflect via parent; quick refresh:
    (trailer as any).online_ordering_enabled = val;
    setSelectedTrailerId(trailer.id);
  };

  const publicUrl = trailer?.slug
    ? `${window.location.origin}/order/${trailer.slug}`
    : "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Online Ordering</h1>
          <p className="text-sm text-muted-foreground">
            Set today's location and menu, then toggle ordering on so customers can order from their phones.
          </p>
        </div>

        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : trailers.length === 0 ? (
          <Card className="p-6">Add a trailer first to enable online ordering.</Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {trailers.map((t: any) => (
                <Button
                  key={t.id}
                  variant={t.id === selectedTrailerId ? "default" : "outline"}
                  onClick={() => setSelectedTrailerId(t.id)}
                  size="sm"
                >
                  {t.name}
                </Button>
              ))}
            </div>

            {trailer && (
              <>
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Online ordering for {trailer.name}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Master switch. When off, the public page shows "not accepting orders".
                      </p>
                    </div>
                    <Switch
                      checked={!!(trailer as any).online_ordering_enabled}
                      onCheckedChange={toggleTrailerOnline}
                    />
                  </div>
                  {publicUrl && (
                    <div className="flex items-center gap-2 text-sm">
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

                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">Today's setup ({today()})</h2>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="oe" className="text-sm">Accepting orders today</Label>
                        <Switch id="oe" checked={orderingEnabled} onCheckedChange={setOrderingEnabled} />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Today's location</Label>
                        <Input
                          placeholder="e.g. Riverside Park, Main St"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Opens at</Label>
                          <Input type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
                        </div>
                        <div>
                          <Label>Closes at</Label>
                          <Input type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Note for customers (optional)</Label>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Cash only after 8pm, expect 10 min wait..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Available items today</Label>
                      <div className="mt-2 grid gap-2 max-h-96 overflow-y-auto sm:grid-cols-2">
                        {menuItems.length === 0 && (
                          <p className="text-sm text-muted-foreground">No active menu items for this trailer.</p>
                        )}
                        {menuItems.map((m) => (
                          <label
                            key={m.id}
                            className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={availableIds.has(m.id)}
                              onCheckedChange={() => toggleItem(m.id)}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{m.name}</div>
                              <div className="text-xs text-muted-foreground">${Number(m.price).toFixed(2)}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button onClick={save} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save today's setup
                    </Button>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
