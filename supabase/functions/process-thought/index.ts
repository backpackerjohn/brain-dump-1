import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SYSTEM_PROMPT } from './ai-prompts.ts';
import { generateEmbedding } from './embedding-service.ts';
import { getOrCreateCategory, linkThoughtToCategory } from './category-service.ts';
import { callAIForThoughts, saveThoughtToDatabase } from './thought-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Process Thought Function Started ===');
    console.log('Timestamp:', new Date().toISOString());

    const { content } = await req.json();
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.error('Invalid input: content is empty or not a string');
      return new Response(
        JSON.stringify({ error: 'Content is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing content (first 100 chars):', content.substring(0, 100) + '...');
    
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User authentication failed');
      throw new Error('User not authenticated');
    }
    
    console.log('User authenticated:', user.id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const thoughts = await callAIForThoughts(content, LOVABLE_API_KEY, SYSTEM_PROMPT);

    console.log(`Generating embeddings for ${thoughts.length} thought(s)...`);
    const processedThoughts = [];
    let embeddingsGenerated = 0;
    let embeddingsFailed = 0;
    
    for (const thought of thoughts) {
      console.log('Processing thought:', thought.title);
      
      let embedding: number[] | null = null;
      let embeddingFailed = false;
      
      try {
        embedding = await generateEmbedding(thought.content, LOVABLE_API_KEY);
        embeddingsGenerated++;
        console.log(`✓ Embedding success for: ${thought.title}`);
      } catch (error) {
        embeddingFailed = true;
        embeddingsFailed++;
        console.error(`✗ Embedding failed for "${thought.title}":`, error);
        // Continue processing - thought will be saved without embedding
      }
      
      const insertedThought = await saveThoughtToDatabase(
        supabase, 
        user.id, 
        thought, 
        embedding,
        embeddingFailed
      );

      console.log('Processing categories:', thought.categories);
      for (const categoryName of thought.categories) {
        const categoryId = await getOrCreateCategory(supabase, user.id, categoryName);
        await linkThoughtToCategory(supabase, insertedThought.id, categoryId);
      }

      processedThoughts.push({
        ...insertedThought,
        categories: thought.categories
      });
    }

    console.log(`=== Successfully processed ${processedThoughts.length} thought(s) ===`);
    console.log(`Embeddings: ${embeddingsGenerated} generated, ${embeddingsFailed} failed`);
    
    return new Response(
      JSON.stringify({ 
        thoughts: processedThoughts,
        metadata: {
          total: processedThoughts.length,
          embeddings_generated: embeddingsGenerated,
          embeddings_failed: embeddingsFailed
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('=== Error Processing Thought ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('authenticated') ? 401 : 
                       errorMessage.includes('authorization') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});