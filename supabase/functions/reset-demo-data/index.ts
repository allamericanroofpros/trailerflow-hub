import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEMO_ORG_ID = "de300000-0000-0000-0000-000000000001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 1: Clear demo transactional data (order of deletion matters for FK)
    const tables = [
      "order_items", "orders", "inventory_logs", "staff_clock_entries",
      "event_checklist_items", "event_staff", "transactions",
      "maintenance_records", "bookings", "menu_item_ingredients",
      "events", "menu_items", "inventory_items", "staff_members", "trailers",
    ];

    for (const table of tables) {
      await supabase.from(table).delete().eq("org_id", DEMO_ORG_ID);
    }

    // Step 2: Re-seed demo data
    // Trailers
    await supabase.from("trailers").insert([
      { id: "de300000-0000-0000-0000-000000000010", name: "The Taco Wagon", type: "food_truck", description: "Authentic street tacos and burritos", status: "active", owner_id: user.id, org_id: DEMO_ORG_ID, avg_ticket: 12.5, staff_required: 2 },
      { id: "de300000-0000-0000-0000-000000000011", name: "Smoky BBQ Trailer", type: "food_trailer", description: "Low and slow BBQ specialties", status: "active", owner_id: user.id, org_id: DEMO_ORG_ID, avg_ticket: 18, staff_required: 3 },
      { id: "de300000-0000-0000-0000-000000000012", name: "Frosty Treats", type: "concession", description: "Ice cream, shaved ice, and smoothies", status: "maintenance", owner_id: user.id, org_id: DEMO_ORG_ID, avg_ticket: 8, staff_required: 1 },
    ]);

    // Staff
    await supabase.from("staff_members").insert([
      { id: "de300000-0000-0000-0000-000000000020", name: "Maria Garcia", email: "maria@demo.traileros.com", hourly_rate: 16, status: "active", org_id: DEMO_ORG_ID, pin: "1234" },
      { id: "de300000-0000-0000-0000-000000000021", name: "Jake Thompson", email: "jake@demo.traileros.com", hourly_rate: 15, status: "active", org_id: DEMO_ORG_ID, pin: "5678" },
      { id: "de300000-0000-0000-0000-000000000022", name: "Aisha Williams", email: "aisha@demo.traileros.com", hourly_rate: 17.5, status: "active", org_id: DEMO_ORG_ID, pin: "9012" },
    ]);

    // Menu Items
    await supabase.from("menu_items").insert([
      { id: "de300000-0000-0000-0000-000000000040", name: "Street Tacos (3)", category: "entree", price: 10, cost: 3.2, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010", sort_order: 1 },
      { id: "de300000-0000-0000-0000-000000000041", name: "Loaded Burrito", category: "entree", price: 13, cost: 4.1, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010", sort_order: 2 },
      { id: "de300000-0000-0000-0000-000000000042", name: "Chips & Guac", category: "appetizer", price: 6, cost: 1.8, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010", sort_order: 3 },
      { id: "de300000-0000-0000-0000-000000000043", name: "Brisket Plate", category: "entree", price: 18, cost: 6.5, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000011", sort_order: 1 },
      { id: "de300000-0000-0000-0000-000000000044", name: "Pulled Pork Sandwich", category: "entree", price: 14, cost: 4.5, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000011", sort_order: 2 },
      { id: "de300000-0000-0000-0000-000000000046", name: "Vanilla Soft Serve", category: "dessert", price: 5, cost: 0.9, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000012", sort_order: 1 },
      { id: "de300000-0000-0000-0000-000000000047", name: "Shaved Ice", category: "drink", price: 6, cost: 0.6, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000012", sort_order: 2 },
      { id: "de300000-0000-0000-0000-000000000049", name: "Bottled Water", category: "drink", price: 2, cost: 0.25, org_id: DEMO_ORG_ID, sort_order: 10 },
    ]);

    // Inventory
    await supabase.from("inventory_items").insert([
      { id: "de300000-0000-0000-0000-000000000050", name: "Corn Tortillas", unit: "dozen", current_stock: 25, par_level: 30, cost_per_unit: 2.5, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010" },
      { id: "de300000-0000-0000-0000-000000000051", name: "Ground Beef", unit: "lb", current_stock: 40, par_level: 50, cost_per_unit: 5.5, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010" },
      { id: "de300000-0000-0000-0000-000000000052", name: "Brisket", unit: "lb", current_stock: 30, par_level: 40, cost_per_unit: 8, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000011" },
      { id: "de300000-0000-0000-0000-000000000054", name: "Vanilla Soft Serve Mix", unit: "gal", current_stock: 8, par_level: 10, cost_per_unit: 12, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000012" },
      { id: "de300000-0000-0000-0000-000000000057", name: "Bottled Water (case)", unit: "case", current_stock: 12, par_level: 15, cost_per_unit: 6, org_id: DEMO_ORG_ID },
    ]);

    // Events
    await supabase.from("events").insert([
      { id: "de300000-0000-0000-0000-000000000030", name: "Downtown Food Fest", event_date: "2026-03-15", start_time: "11:00", end_time: "20:00", location: "Main Street Plaza", stage: "confirmed", trailer_id: "de300000-0000-0000-0000-000000000010", org_id: DEMO_ORG_ID, attendance_estimate: 5000, vendor_fee: 250 },
      { id: "de300000-0000-0000-0000-000000000031", name: "Corporate Lunch - Acme Co", event_date: "2026-03-20", start_time: "11:30", end_time: "13:30", location: "Acme Corp HQ", stage: "confirmed", trailer_id: "de300000-0000-0000-0000-000000000011", org_id: DEMO_ORG_ID, attendance_estimate: 200 },
      { id: "de300000-0000-0000-0000-000000000034", name: "Farmers Market (Weekly)", event_date: "2026-03-12", start_time: "08:00", end_time: "13:00", location: "North Market", stage: "completed", trailer_id: "de300000-0000-0000-0000-000000000012", org_id: DEMO_ORG_ID, attendance_estimate: 1500, vendor_fee: 75 },
    ]);

    // Bookings
    await supabase.from("bookings").insert([
      { id: "de300000-0000-0000-0000-000000000060", event_name: "Johnson Wedding Reception", client_name: "Sarah Johnson", client_email: "sarah.j@email.com", event_date: "2026-04-18", status: "confirmed", total_price: 3500, deposit_amount: 1000, deposit_paid: true, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010" },
      { id: "de300000-0000-0000-0000-000000000061", event_name: "Tech Startup Launch Party", client_name: "Mike Chen", client_email: "mike@startup.io", event_date: "2026-04-25", status: "pending", total_price: 2200, org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000011" },
    ]);

    // Transactions
    await supabase.from("transactions").insert([
      { type: "income", amount: 2450, category: "event_revenue", description: "Downtown Food Fest sales", transaction_date: "2026-03-10", org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010" },
      { type: "income", amount: 1800, category: "event_revenue", description: "Farmers Market weekly sales", transaction_date: "2026-03-12", org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000012" },
      { type: "expense", amount: 450, category: "food_supplies", description: "Weekly meat order", transaction_date: "2026-03-08", org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000011" },
      { type: "expense", amount: 180, category: "fuel", description: "Diesel - Taco Wagon", transaction_date: "2026-03-09", org_id: DEMO_ORG_ID, trailer_id: "de300000-0000-0000-0000-000000000010" },
    ]);

    // Maintenance
    await supabase.from("maintenance_records").insert([
      { title: "Generator Oil Change", type: "preventive", status: "pending", trailer_id: "de300000-0000-0000-0000-000000000010", org_id: DEMO_ORG_ID, due_date: "2026-03-18", cost: 85 },
      { title: "Refrigeration Unit Repair", type: "corrective", status: "in_progress", trailer_id: "de300000-0000-0000-0000-000000000012", org_id: DEMO_ORG_ID, due_date: "2026-03-10", cost: 350 },
    ]);

    return new Response(
      JSON.stringify({ success: true, message: "Demo data reset complete" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
