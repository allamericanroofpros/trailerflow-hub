const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventName, location } = await req.json();

    if (!eventName) {
      return new Response(
        JSON.stringify({ error: 'eventName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Perplexity first (has web search), fall back to Lovable AI
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    const systemPrompt = `You are an event research assistant for food trailer/truck vendors. Given an event name, provide the best information you know about it. Return a JSON object with these fields (use null for unknown):
{
  "name": "Official event name",
  "location": "City, State",
  "address": "Full venue address",
  "event_date": "YYYY-MM-DD",
  "event_end_date": "YYYY-MM-DD or null",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "event_type": "festival|market|corporate|concert|fair|other",
  "attendance_estimate": number,
  "vendor_fee": number or null,
  "description": "Brief description",
  "notes": "Vendor-relevant details like application deadlines, requirements, etc."
}
Return ONLY valid JSON, no markdown, no code fences.`;

    const searchQuery = location
      ? `"${eventName}" event ${location} 2025 2026 date venue attendance vendor fee`
      : `"${eventName}" event 2025 2026 date venue location attendance vendor fee`;

    let content = '';
    let citations: string[] = [];

    if (perplexityKey) {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: searchQuery }
            ],
            search_recency_filter: 'year',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          content = data.choices?.[0]?.message?.content || '';
          citations = data.citations || [];
        } else {
          console.error('Perplexity failed, falling back to Lovable AI:', response.status);
        }
      } catch (e) {
        console.error('Perplexity error, falling back:', e);
      }
    }

    // Fallback to Lovable AI gateway
    if (!content && lovableKey) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Research this event and provide details: ${searchQuery}` }
          ],
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        content = data.choices?.[0]?.message?.content || '';
      } else {
        const errText = await response.text();
        console.error('Lovable AI error:', response.status, errText);
      }
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No AI provider available. Check API configuration.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse JSON from the response
    let eventData = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        eventData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse event data:', e);
    }

    return new Response(
      JSON.stringify({ eventData, citations, rawContent: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Event search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
