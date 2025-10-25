import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Find Connections Function Started ===');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('Fetching active thoughts for user:', user.id);

    const { data: thoughts, error: fetchError } = await supabase
      .from('thoughts')
      .select(`
        id,
        title,
        snippet,
        content,
        is_completed,
        thought_categories(
          categories(
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_completed', false)
      .limit(50); // Limit to prevent excessive API calls

    if (fetchError) {
      console.error('Error fetching thoughts:', fetchError);
      throw fetchError;
    }

    if (!thoughts || thoughts.length < 2) {
      console.log('Not enough thoughts for connections');
      return new Response(
        JSON.stringify({ connections: [], message: 'Need at least 2 thoughts to find connections' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${thoughts.length} thoughts for connections`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare thought data for AI analysis
    const thoughtSummaries = thoughts.map(t => {
      const categories = t.thought_categories?.map((tc: any) => tc.categories.name) || [];
      return {
        id: t.id,
        title: t.title,
        snippet: t.snippet || t.content.substring(0, 150),
        categories: categories
      };
    }).slice(0, 20); // Limit to 20 thoughts to keep token count reasonable

    const analysisPrompt = `Analyze these thoughts and find 3-5 surprising, non-obvious connections between them. Focus on thoughts from DIFFERENT categories that share hidden themes or could inspire each other.

${thoughtSummaries.map((t, i) => `${i + 1}. "${t.title}" (${t.categories.join(', ')})\n   ${t.snippet}`).join('\n\n')}

Return a JSON object with this structure:
{
  "connections": [
    {
      "thought1_index": 0,
      "thought2_index": 3,
      "reason": "Brief explanation of the surprising connection"
    }
  ]
}

Focus on quality over quantity. Only include truly interesting connections.`;

    console.log('Calling AI to find connections...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at finding non-obvious connections between ideas. You look for surprising patterns, complementary concepts, and creative synergies.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    let parsedConnections;
    try {
      parsedConnections = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Map indices back to actual thoughts
    const connections = (parsedConnections.connections || [])
      .filter((conn: any) => 
        conn.thought1_index !== undefined && 
        conn.thought2_index !== undefined &&
        thoughtSummaries[conn.thought1_index] &&
        thoughtSummaries[conn.thought2_index]
      )
      .map((conn: any) => {
        const t1 = thoughtSummaries[conn.thought1_index];
        const t2 = thoughtSummaries[conn.thought2_index];
        
        return {
          thought1_id: t1.id,
          thought2_id: t2.id,
          thought1: {
            title: t1.title,
            categories: t1.categories,
            is_completed: false
          },
          thought2: {
            title: t2.title,
            categories: t2.categories,
            is_completed: false
          },
          reason: conn.reason
        };
      })
      .slice(0, 10); // Limit to top 10 connections

    console.log(`Found ${connections.length} connections`);

    return new Response(
      JSON.stringify({ connections }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Error Finding Connections ===');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('authenticated') ? 401 : 
                       errorMessage.includes('LOVABLE_API_KEY') ? 500 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
