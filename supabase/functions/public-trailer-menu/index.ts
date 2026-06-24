import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      .select("id, name, description, image_url, slug, online_ordering_enabled, org_id")
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

    const { data: setup } = await supabase
      .from("trailer_daily_setup")
      .select("location, ordering_enabled, note, available_menu_item_ids, opens_at, closes_at")
      .eq("trailer_id", trailer.id)
      .eq("setup_date", today)
      .maybeSingle();

    const acceptingOrders =
      !!trailer.online_ordering_enabled && !!setup?.ordering_enabled;

    let menuItems: any[] = [];
    if (acceptingOrders && setup?.available_menu_item_ids?.length) {
      const { data: items } = await supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, category, modifiers")
        .in("id", setup.available_menu_item_ids)
        .eq("is_active", true)
        .order("sort_order");
      menuItems = items ?? [];
    }

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
        location: setup?.location ?? null,
        note: setup?.note ?? null,
        opens_at: setup?.opens_at ?? null,
        closes_at: setup?.closes_at ?? null,
        menuItems,
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
