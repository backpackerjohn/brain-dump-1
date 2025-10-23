import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple k-means clustering implementation
function kMeansClustering(embeddings: number[][], k: number) {
  const n = embeddings.length;
  const dim = embeddings[0].length;
  
  // Initialize centroids randomly
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();
  while (centroids.length < k && centroids.length < n) {
    const idx = Math.floor(Math.random() * n);
    if (!usedIndices.has(idx)) {
      centroids.push([...embeddings[idx]]);
      usedIndices.add(idx);
    }
  }
  
  let assignments = new Array(n).fill(0);
  let changed = true;
  let iterations = 0;
  const maxIterations = 50;
  
  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    
    // Assign points to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      
      for (let j = 0; j < centroids.length; j++) {
        const dist = cosineSimilarity(embeddings[i], centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = j;
        }
      }
      
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }
    
    // Update centroids
    for (let j = 0; j < centroids.length; j++) {
      const clusterPoints = embeddings.filter((_, i) => assignments[i] === j);
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dim; d++) {
          centroids[j][d] = clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length;
        }
      }
    }
  }
  
  return assignments;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
}

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

    // Get unclustered thoughts with embeddings
    const { data: thoughts, error: thoughtsError } = await supabase
      .from('thoughts')
      .select('id, content, title, snippet, embedding')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .not('embedding', 'is', null);

    if (thoughtsError) throw thoughtsError;
    if (!thoughts || thoughts.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Need at least 2 thoughts to cluster' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out thoughts already in clusters
    const { data: clusteredThoughts } = await supabase
      .from('thought_clusters')
      .select('thought_id');

    const clusteredIds = new Set(clusteredThoughts?.map(ct => ct.thought_id) || []);
    const unclusteredThoughts = thoughts.filter(t => !clusteredIds.has(t.id));

    if (unclusteredThoughts.length < 2) {
      return new Response(
        JSON.stringify({ error: 'All thoughts are already clustered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddings = unclusteredThoughts.map(t => t.embedding);
    const k = Math.min(Math.ceil(unclusteredThoughts.length / 3), 5);
    
    const assignments = kMeansClustering(embeddings, k);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const createdClusters = [];
    
    // Create clusters and assign thoughts
    for (let clusterId = 0; clusterId < k; clusterId++) {
      const clusterThoughts = unclusteredThoughts.filter((_, i) => assignments[i] === clusterId);
      
      if (clusterThoughts.length === 0) continue;
      
      // Get sample snippets for naming
      const sampleSnippets = clusterThoughts
        .slice(0, 3)
        .map(t => t.snippet || t.title)
        .join('\n');
      
      // Generate cluster name
      const nameResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'system',
            content: 'Generate a concise 2-3 word name for this cluster of related thoughts. Return only the name, no explanation.'
          }, {
            role: 'user',
            content: sampleSnippets
          }]
        }),
      });

      const nameData = await nameResponse.json();
      const clusterName = nameData.choices[0].message.content.trim().replace(/['"]/g, '');
      
      // Create cluster
      const { data: cluster, error: clusterError } = await supabase
        .from('clusters')
        .insert({
          user_id: user.id,
          name: clusterName,
          is_collapsed: false
        })
        .select()
        .single();

      if (clusterError) throw clusterError;
      
      // Link thoughts to cluster
      const thoughtLinks = clusterThoughts.map(t => ({
        thought_id: t.id,
        cluster_id: cluster.id,
        is_completed: false
      }));
      
      await supabase
        .from('thought_clusters')
        .insert(thoughtLinks);
      
      createdClusters.push({
        ...cluster,
        thoughtCount: clusterThoughts.length
      });
    }

    return new Response(
      JSON.stringify({ clusters: createdClusters }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating clusters:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});