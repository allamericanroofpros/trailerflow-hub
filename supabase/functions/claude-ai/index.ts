import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
  "admin-ai": `You are an internal platform analytics AI for VendorFlow. You help super admins analyze cross-org trends, churn risk, usage patterns, and support needs. You have access to aggregated platform data. Be analytical and direct. Use markdown.`,
};

// Features that require specific plan entitlements
const GATED_FEATURES: Record<string, string> = {
  discovery: "aiDiscovery",
  forecast: "aiForecasting",
  chat: "aiChat",
  "validate-trailer": "aiChat",
};

// Plan entitlements (must mirror src/config/entitlements.ts)
const PLAN_ENTITLEMENTS: Record<string, Record<string, boolean>> = {
  free: { aiChat: false, aiDiscovery: false, aiForecasting: false },
  starter: { aiChat: true, aiDiscovery: false, aiForecasting: false },
  pro: { aiChat: true, aiDiscovery: true, aiForecasting: true },
  enterprise: { aiChat: true, aiDiscovery: true, aiForecasting: true },
};

type AIScope = "org-private" | "benchmark" | "admin";

function resolveScope(feature: string, role: string): AIScope {
  if (feature === "admin-ai") return "admin";
  return "org-private";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const { messages, system, stream = true, max_tokens = 2048, feature, context } = await req.json();

    // ─── AUTH & IDENTITY ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let callerUserId: string | null = null;
    let callerRole: string | null = null;
    let isSuperAdmin = false;
    let orgPlan = "free";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    callerUserId = user.id;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check super admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    callerRole = roleData?.role || "staff";
    isSuperAdmin = callerRole === "super_admin";

    // Get org plan
    const ctxOrgId = context?.org_id;
    if (ctxOrgId) {
      const { data: orgData } = await adminClient
        .from("organizations")
        .select("plan")
        .eq("id", ctxOrgId)
        .single();
      orgPlan = orgData?.plan || "free";
    }

    const ctxTrailerId = context?.trailer_id || null;
    const ctxModule = context?.module || null;

    const scope = resolveScope(feature || "chat", callerRole || "staff");

    // ─── ADMIN-AI GATING ───
    if (scope === "admin" && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Admin AI access requires super admin role." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PLAN ENTITLEMENT GATING ───
    if (!isSuperAdmin) {
      const featureKey = feature || "chat";
      const entitlementKey = GATED_FEATURES[featureKey];
      if (entitlementKey) {
        const planEnts = PLAN_ENTITLEMENTS[orgPlan] || PLAN_ENTITLEMENTS.free;
        if (!planEnts[entitlementKey]) {
          const featureLabels: Record<string, string> = {
            aiDiscovery: "AI Event Discovery",
            aiForecasting: "AI Revenue Forecasting",
            aiChat: "AI Assistant",
          };
          const label = featureLabels[entitlementKey] || "This AI feature";
          return new Response(JSON.stringify({
            error: `${label} requires a plan upgrade. Please upgrade to access this feature.`,
            code: "PLAN_LIMIT",
          }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Build scoped system prompt
    let systemPrompt = system || systemPrompts[feature] || systemPrompts.chat;

    if (scope === "org-private" && ctxOrgId) {
      systemPrompt += `\n\nCONTEXT:
- Organization ID: ${ctxOrgId}
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

    // Build Anthropic API request — system goes in top-level field, not in messages
    const anthropicMessages = (messages || [])
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));

    const anthropicBody: Record<string, unknown> = {
      model: "claude-sonnet-4-5",
      max_tokens: max_tokens,
      system: systemPrompt,
      messages: anthropicMessages,
      stream,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      // Transform Anthropic SSE stream to OpenAI-compatible format for the frontend
      const anthropicStream = response.body!;
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        const reader = anthropicStream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                  // Convert to OpenAI-compatible SSE chunk
                  const chunk = {
                    choices: [{ delta: { content: event.delta.text } }],
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                } else if (event.type === "message_stop") {
                  await writer.write(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // partial JSON, skip
              }
            }
          }
          // Ensure [DONE] is sent
          await writer.write(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream transform error:", err);
        } finally {
          writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming: transform Anthropic response to OpenAI-compatible shape
    const data = await response.json();
    const textContent = data.content
      ?.filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("") || "";

    return new Response(JSON.stringify({
      choices: [{ message: { content: textContent } }],
    }), {
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
