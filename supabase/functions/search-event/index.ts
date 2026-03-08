const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Perplexity connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eventName, location } = await req.json();

    if (!eventName) {
      return new Response(
        JSON.stringify({ error: 'eventName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = location
      ? `"${eventName}" event ${location} 2025 2026 date venue attendance vendor fee`
      : `"${eventName}" event 2025 2026 date venue location attendance vendor fee`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are an event research assistant for food trailer/truck vendors. Given an event name, search for real information about it. Return a JSON object with these fields (use null for unknown):
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
Return ONLY valid JSON, no markdown, no code fences.`
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'year',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Perplexity API error:', response.status, errText);
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Perplexity credits depleted. Please top up your Perplexity account.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Perplexity API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

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
