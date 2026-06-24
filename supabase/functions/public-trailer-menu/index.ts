import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) throw new Error("Missing slug");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: trailer, error: tErr } = await supabase
      .from("trailers")
      .select("id, name, description, image_url, slug, online_ordering_enabled, online_ordering_force_closed, org_id")
      .eq("slug", slug)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!trailer) {
      return new Response(JSON.stringify({ error: "Trailer not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Today's booking for this trailer (schedule-driven location/window)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, event_name, location, start_time, end_time, status")
      .eq("trailer_id", trailer.id)
      .eq("event_date", today)
      .in("status", ["confirmed", "pending"])
      .order("start_time", { ascending: true });

    const todaysBooking = bookings?.[0] ?? null;

    const hasSchedule = !!todaysBooking && !!todaysBooking.location;
    const acceptingOrders =
      !!trailer.online_ordering_enabled &&
      !trailer.online_ordering_force_closed &&
      hasSchedule;

    // Menu items: all active for this trailer + org-wide (trailer_id IS NULL) items
    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name, description, price, image_url, category, modifiers")
      .eq("org_id", trailer.org_id)
      .or(`trailer_id.eq.${trailer.id},trailer_id.is.null`)
      .eq("is_active", true)
      .order("category")
      .order("sort_order");

    return new Response(
      JSON.stringify({
        trailer: {
          id: trailer.id,
          name: trailer.name,
          description: trailer.description,
          image_url: trailer.image_url,
          slug: trailer.slug,
        },
        acceptingOrders,
        forceClosed: !!trailer.online_ordering_force_closed,
        enabled: !!trailer.online_ordering_enabled,
        booking: todaysBooking,
        menuItems: acceptingOrders ? (items ?? []) : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[PUBLIC-TRAILER-MENU]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
