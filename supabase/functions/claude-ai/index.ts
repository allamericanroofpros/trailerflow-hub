import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompts: Record<string, string> = {
  chat: `You are an AI business assistant for a food trailer/truck management platform. You have expertise in event planning, revenue forecasting, staff scheduling, menu optimization, and market trends. Keep answers concise, actionable, and data-driven. Use markdown formatting.`,
  discovery: `You are an AI event analyst for food trailer businesses. Analyze event opportunities and return a JSON array of EXACTLY 6 recommendations. Each object must have: name (string), date (string), location (string - city and state), type (string), profitEstimate (string like "$X,XXX–$X,XXX"), aiRank (number 0-100), attendance (string), reasoning (string). If a location or radius is specified, ALL events must be within that geographic area. Return ONLY a valid JSON array with no markdown formatting, no code fences, no extra text.`,
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
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, system, stream = true, max_tokens = 2048, feature } = await req.json();
    const systemPrompt = system || systemPrompts[feature] || systemPrompts.chat;

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
