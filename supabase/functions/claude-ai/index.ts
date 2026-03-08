import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { messages, system, stream = true, max_tokens = 2048, feature } = await req.json();

    // Feature-specific system prompts
    const systemPrompts: Record<string, string> = {
      chat: `You are an AI business assistant for a food trailer/truck management platform. You have expertise in:
- Event planning and logistics for food vendors
- Revenue forecasting and financial analysis
- Staff scheduling and management
- Menu optimization and pricing strategy
- Market trends in the food truck industry
Keep answers concise, actionable, and data-driven when possible. Use markdown formatting.`,

      discovery: `You are an AI event analyst for food trailer businesses. Analyze event opportunities and return a JSON array of recommendations. Each should include:
- name: event name
- date: event date range
- location: city, state
- type: event category (Festival, Concert, Market, Corporate, etc.)
- profitEstimate: estimated profit range as string
- aiRank: 0-100 confidence score
- attendance: estimated attendance as string
- reasoning: brief explanation of why this is a good fit
Return ONLY valid JSON, no markdown or explanation.`,

      forecast: `You are a revenue forecasting AI for food trailer businesses. Given business data, provide revenue forecasts. Return a JSON object with:
- weeklyForecast: number (projected revenue this week)
- monthlyForecast: number (projected revenue this month)
- trend: "up" | "down" | "stable"
- confidence: 0-100
- insights: array of 2-3 brief insight strings
- suggestions: array of top 3 event suggestions with { event, date, revenue, confidence }
Return ONLY valid JSON, no markdown or explanation.`,
    };

    const systemPrompt = system || systemPrompts[feature] || systemPrompts.chat;

    const body: Record<string, unknown> = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens,
      system: systemPrompt,
      messages,
    };

    if (stream) {
      body.stream = true;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Anthropic error:", response.status, errText);
        const status = response.status === 429 ? 429 : response.status === 402 ? 402 : 500;
        return new Response(JSON.stringify({ error: `Claude API error: ${response.status}` }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Anthropic error:", response.status, errText);
        return new Response(JSON.stringify({ error: `Claude API error: ${response.status}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("claude-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
