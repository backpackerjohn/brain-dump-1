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
    if (!user) throw new Error('User not authenticated');

    // Get all thoughts with embeddings
    const { data: thoughts, error: thoughtsError } = await supabase
      .from('thoughts')
      .select(`
        id,
        title,
        snippet,
        embedding,
        thought_categories(
          categories(name)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .not('embedding', 'is', null);

    if (thoughtsError) throw thoughtsError;
    if (!thoughts || thoughts.length < 2) {
      return new Response(
        JSON.stringify({ connections: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connections = [];
    const threshold = 0.3; // Similarity threshold for connections
    
    // Find connections between thoughts with different categories
    for (let i = 0; i < thoughts.length; i++) {
      for (let j = i + 1; j < thoughts.length; j++) {
        const thought1 = thoughts[i];
        const thought2 = thoughts[j];
        
        // Get categories for both thoughts
        const cats1 = thought1.thought_categories?.map(tc => {
          const categoriesArray = tc.categories as unknown as { name: string }[];
          return categoriesArray[0]?.name || '';
        }).filter(Boolean) || [];
        const cats2 = thought2.thought_categories?.map(tc => {
          const categoriesArray = tc.categories as unknown as { name: string }[];
          return categoriesArray[0]?.name || '';
        }).filter(Boolean) || [];
        
        // Only consider if they have different categories (non-obvious connections)
        const hasOverlap = cats1.some(c => cats2.includes(c));
        if (hasOverlap) continue;
        
        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(
          thought1.embedding,
          thought2.embedding
        );
        
        if (similarity > (1 - threshold)) {
          connections.push({
            thought1: {
              id: thought1.id,
              title: thought1.title,
              categories: cats1
            },
            thought2: {
              id: thought2.id,
              title: thought2.title,
              categories: cats2
            },
            similarity: similarity,
            reason: 'Semantically related despite different categories'
          });
        }
      }
    }
    
    // Sort by similarity descending
    connections.sort((a, b) => b.similarity - a.similarity);

    return new Response(
      JSON.stringify({ connections: connections.slice(0, 10) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error finding connections:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateCosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}