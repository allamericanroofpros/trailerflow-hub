import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompts: Record<string, string> = {
  chat: `You are an AI business assistant for a food trailer/truck management platform. You have expertise in event planning, revenue forecasting, staff scheduling, menu optimization, and market trends. Keep answers concise, actionable, and data-driven. Use markdown formatting.

IMPORTANT: You can ONLY access data for the current user's organization. Never reference or compare with other organizations' raw data. If asked about industry benchmarks, use only aggregated benchmark data.`,

  discovery: `You are an AI event analyst for food trailer businesses. You MUST use the trailer's exact cost data (avg_ticket, customers_per_hour, food_cost_percent, staff_required, staff_hourly_rate, setup_teardown_hours, fuel_cost_per_event) to calculate NET PROFIT for each event. Show the math in reasoning. Formula: Revenue = avg_ticket × customers/hr × event_hours. Costs = (revenue × food_cost%) + (staff × rate × (event_hrs + setup_hrs)) + fuel. Net = Revenue - Costs - vendor_fee. Return a JSON array of EXACTLY 6 recommendations. Each object must have: name (string), date (string YYYY-MM-DD), location (string - city and state), type (string), profitEstimate (string like "$X,XXX net profit" with real calculated numbers), aiRank (number 0-100), attendance (string), reasoning (string with profit math breakdown). If a location or radius is specified, ALL events must be within that geographic area. Return ONLY a valid JSON array with no markdown formatting, no code fences, no extra text.`,

  forecast: `You are a revenue forecasting AI for food trailer businesses. Given business data, provide revenue forecasts. Return a JSON object with: weeklyForecast (number), monthlyForecast (number), trend ("up"|"down"|"stable"), confidence (0-100), insights (array of strings), suggestions (array of {event, date, revenue, confidence}). Return ONLY valid JSON, no markdown.`,

  "validate-trailer": `You are a food trailer business cost analyst. Given a trailer's cost/revenue data, validate whether the numbers look realistic based on industry benchmarks for that trailer type. Return a JSON object with:
- overall: "good" | "warning" | "concern" (overall assessment)
- score: 0-100 (how realistic the numbers are)
- items: array of { field: string, status: "good" | "warning" | "concern", message: string }
  Check these specifically:
  - avg_ticket: Most food trailers $6-15, ice cream $4-10, gourmet $12-20
  - customers_per_hour: Typical 15-40, festivals up to 60
  - food_cost_percent: Industry norm 25-35%, below 20% suspicious, above 40% concerning
  - staff_hourly_rate: $12-25/hr typical
  - fuel_cost: $30-100 per event typical
  - setup_teardown_hours: 1-4 typical
  - profit_per_hour: If over $300/hr, flag as potentially optimistic
  Be encouraging but honest. If numbers look good, say so. If something seems off, explain why with industry context.
  Return ONLY valid JSON, no markdown.`,

  // Internal admin AI — super admin only, can analyze all orgs
  "admin-ai": `You are an internal platform analytics AI for TrailerOS. You help super admins analyze cross-org trends, churn risk, usage patterns, and support needs. You have access to aggregated platform data. Be analytical and direct. Use markdown.`,
};

// Scope levels: org-private, benchmark (cross-org aggregated), admin (super admin only)
type AIScope = "org-private" | "benchmark" | "admin";

function resolveScope(feature: string, role: string): AIScope {
  if (feature === "admin-ai") return "admin";
  // All user-facing features are org-private
  return "org-private";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, system, stream = true, max_tokens = 2048, feature, context } = await req.json();

    // ─── AI CONTEXT GATING ───
    // Verify caller identity and enforce scoping
    const authHeader = req.headers.get("Authorization");
    let callerOrgId: string | null = null;
    let callerUserId: string | null = null;
    let callerRole: string | null = null;
    let isSuperAdmin = false;

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await callerClient.auth.getUser();
      if (user) {
        callerUserId = user.id;

        // Check super admin
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceKey);
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        callerRole = roleData?.role || "staff";
        isSuperAdmin = callerRole === "super_admin";
      }
    }

    // Extract context from client
    const ctxOrgId = context?.org_id || null;
    const ctxTrailerId = context?.trailer_id || null;
    const ctxModule = context?.module || null;

    callerOrgId = ctxOrgId;

    const scope = resolveScope(feature || "chat", callerRole || "staff");

    // Block admin-ai for non-super-admins
    if (scope === "admin" && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Admin AI access requires super admin role." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build scoped system prompt
    let systemPrompt = system || systemPrompts[feature] || systemPrompts.chat;

    // Inject context metadata into the system prompt for org-private scope
    if (scope === "org-private" && callerOrgId) {
      systemPrompt += `\n\nCONTEXT:
- Organization ID: ${callerOrgId}
- User ID: ${callerUserId || "unknown"}
- Role: ${callerRole || "unknown"}
- Active Trailer: ${ctxTrailerId || "none"}
- Current Module: ${ctxModule || "general"}
- Scope: ORG-PRIVATE — Only reference this organization's data. Never cross-reference other organizations.`;
    } else if (scope === "admin") {
      systemPrompt += `\n\nCONTEXT:
- Actor: Super Admin (${callerUserId})
- Scope: INTERNAL ADMIN — You may analyze cross-org patterns, usage, churn risk, and support trends.`;
    }

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
