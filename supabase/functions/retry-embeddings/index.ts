import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateEmbedding(content: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: content
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Retry Embeddings Function Started ===');
    
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Find thoughts that need embedding retry
    const { data: failedThoughts, error: fetchError } = await supabase
      .from('thoughts')
      .select('id, content, title, embedding_retry_count')
      .eq('user_id', user.id)
      .eq('embedding_failed', true)
      .lt('embedding_retry_count', 3)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    if (!failedThoughts || failedThoughts.length === 0) {
      console.log('No thoughts need embedding retry');
      return new Response(
        JSON.stringify({ 
          success: true,
          retried: 0,
          message: 'No thoughts need embedding retry'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${failedThoughts.length} thoughts to retry`);

    let successCount = 0;
    let failCount = 0;

    for (const thought of failedThoughts) {
      try {
        console.log(`Retrying embedding for: ${thought.title}`);
        const embedding = await generateEmbedding(thought.content, LOVABLE_API_KEY);
        
        const { error: updateError } = await supabase
          .from('thoughts')
          .update({
            embedding: embedding,
            embedding_failed: false,
            embedding_retry_count: thought.embedding_retry_count + 1,
            last_embedding_attempt: new Date().toISOString()
          })
          .eq('id', thought.id);

        if (updateError) {
          throw updateError;
        }

        successCount++;
        console.log(`✓ Successfully generated embedding for: ${thought.title}`);
      } catch (error) {
        failCount++;
        console.error(`✗ Failed to generate embedding for "${thought.title}":`, error);
        
        // Update retry count even on failure
        await supabase
          .from('thoughts')
          .update({
            embedding_retry_count: thought.embedding_retry_count + 1,
            last_embedding_attempt: new Date().toISOString()
          })
          .eq('id', thought.id);
      }
    }

    console.log(`=== Retry complete: ${successCount} succeeded, ${failCount} failed ===`);

    return new Response(
      JSON.stringify({
        success: true,
        retried: failedThoughts.length,
        succeeded: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('=== Error in Retry Embeddings ===');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
