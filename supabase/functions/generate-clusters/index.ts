import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThoughtInput {
  id: string;
  text: string;
}

interface ClusterResult {
  clusterName: string;
  thoughtIds: string[];
}

/**
 * Process a chunk of thoughts using Gemini AI for semantic clustering
 */
async function processChunkWithAI(
  thoughts: ThoughtInput[], 
  existingClusters: string[],
  apiKey: string
): Promise<ClusterResult[]> {
  
  const prompt = `You are an expert personal assistant specializing in organizing information. Your task is to analyze a list of a user's raw, unstructured thoughts and group them into meaningful, thematic clusters.

**Instructions:**
1. **Analyze Holistically:** Read through all the provided thoughts to understand the main themes present.
2. **Form Clusters:** Group thoughts that are clearly related by project, topic, goal, or context.
3. **Name Clusters Concisely:** Create a short, descriptive name for each cluster (3-5 words max). The name should represent the core theme of the thoughts within it.
4. **Be Discerning:** It is better to leave a thought unclustered than to force it into an irrelevant group. Do not create a "Miscellaneous" or "General" cluster. Only cluster thoughts that have strong thematic connections.
5. **Output Format:** You MUST provide your answer in the JSON format specified in the schema.

${existingClusters.length > 0 ? `**Existing Clusters:**
The following cluster names already exist. Try to add thoughts to these clusters if they fit before creating new ones:
${existingClusters.map(name => `- ${name}`).join('\n')}
` : ''}

**Input Thoughts:**
${JSON.stringify(thoughts, null, 2)}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp',
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'cluster_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              clusters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    clusterName: {
                      type: 'string',
                      description: 'A concise, descriptive name for the theme of the cluster (3-5 words max)'
                    },
                    thoughtIds: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'An array of the original thought IDs that belong in this cluster'
                    }
                  },
                  required: ['clusterName', 'thoughtIds'],
                  additionalProperties: false
                }
              }
            },
            required: ['clusters'],
            additionalProperties: false
          }
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`AI clustering failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    console.error('No content in Gemini response:', data);
    return [];
  }

  // Parse the response - it might be a string or already parsed
  let clusters: ClusterResult[] = [];
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      clusters = parsed.clusters || [];
    } catch (e) {
      console.error('Failed to parse Gemini response:', content);
      return [];
    }
  } else if (content?.clusters) {
    clusters = content.clusters;
  }

  // Validate and filter clusters
  return clusters.filter(c => 
    c.clusterName && 
    c.thoughtIds && 
    Array.isArray(c.thoughtIds) && 
    c.thoughtIds.length >= 2 // Only keep clusters with 2+ thoughts
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Generate Clusters Function Started ===');
    
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

    // Fetch all active thoughts
    const { data: thoughtsRaw, error: fetchError } = await supabase
      .from('thoughts')
      .select(`
        id,
        content
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching thoughts:', fetchError);
      throw fetchError;
    }

    // Exclude thoughts already linked to clusters
    let thoughts = thoughtsRaw || [];
    if (thoughts.length > 0) {
      const ids = thoughts.map((t: any) => t.id);
      const { data: links, error: linksError } = await supabase
        .from('cluster_thoughts')
        .select('thought_id')
        .in('thought_id', ids);
      
      if (linksError) {
        console.error('Error fetching existing cluster links:', linksError);
        throw linksError;
      }
      
      const linked = new Set((links || []).map((l: any) => l.thought_id));
      thoughts = thoughts.filter((t: any) => !linked.has(t.id));
    }

    console.log(`Found ${thoughts.length} unclustered thoughts`);

    // RULE #1: Threshold Trigger - Need at least 10 thoughts
    if (thoughts.length < 10) {
      console.log('Not enough thoughts for clustering');
      return new Response(
        JSON.stringify({ 
          clusters: [], 
          message: `Need at least 10 unclustered thoughts to generate clusters. You currently have ${thoughts.length}.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare thoughts for AI processing
    const thoughtInputs: ThoughtInput[] = thoughts.map((t: any) => ({
      id: t.id,
      text: t.content || ''
    }));

    // RULE #2: Chunking Protocol for scalability
    const CHUNK_SIZE = 200;
    const chunks: ThoughtInput[][] = [];
    
    for (let i = 0; i < thoughtInputs.length; i += CHUNK_SIZE) {
      chunks.push(thoughtInputs.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${thoughtInputs.length} thoughts in ${chunks.length} chunk(s)`);

    let existingClusterNames: string[] = [];
    const allClustersToCreate: ClusterResult[] = [];

    // Process each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} thoughts)`);
      
      const clustersFromChunk = await processChunkWithAI(
        chunks[i], 
        existingClusterNames,
        LOVABLE_API_KEY
      );
      
      console.log(`Chunk ${i + 1} produced ${clustersFromChunk.length} cluster(s)`);
      allClustersToCreate.push(...clustersFromChunk);
      
      // Update existing cluster names for next iteration
      existingClusterNames = allClustersToCreate.map(c => c.clusterName);
    }

    console.log(`Total clusters to create: ${allClustersToCreate.length}`);

    if (allClustersToCreate.length === 0) {
      return new Response(
        JSON.stringify({ 
          clusters: [], 
          message: 'No strong thematic connections found among your thoughts. Try adding more thoughts or wait until you have more diverse content.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert clusters and link thoughts
    const createdClusters = [];
    
    for (const cluster of allClustersToCreate) {
      // Check if a cluster with this name already exists (from previous chunks)
      const { data: existingCluster, error: checkError } = await supabase
        .from('clusters')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', cluster.clusterName)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing cluster:', checkError);
        continue;
      }

      let clusterId: string;

      if (existingCluster) {
        // Add to existing cluster
        clusterId = existingCluster.id;
        console.log(`Adding thoughts to existing cluster: ${cluster.clusterName}`);
      } else {
        // Create new cluster
      const { data: newCluster, error: clusterError } = await supabase
        .from('clusters')
        .insert({
          user_id: user.id,
            name: cluster.clusterName,
            is_manual: false
        })
        .select()
        .single();

      if (clusterError) {
        console.error('Error creating cluster:', clusterError);
        continue;
      }

        clusterId = newCluster.id;
        createdClusters.push(newCluster);
      }

      // Link thoughts to cluster (avoid duplicates)
      const thoughtClusterLinks = cluster.thoughtIds.map(thoughtId => ({
        thought_id: thoughtId,
        cluster_id: clusterId
      }));

      // Use upsert to avoid conflicts
      const { error: linkError } = await supabase
        .from('cluster_thoughts')
        .upsert(thoughtClusterLinks, {
          onConflict: 'cluster_id,thought_id',
          ignoreDuplicates: true
        });

      if (linkError) {
        console.error('Error linking thoughts to cluster:', linkError);
      }
    }

    console.log(`Successfully created ${createdClusters.length} new clusters`);

    return new Response(
      JSON.stringify({ 
        clusters: createdClusters,
        message: `Successfully organized your thoughts into ${createdClusters.length} cluster${createdClusters.length !== 1 ? 's' : ''}.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Error Generating Clusters ===');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : '');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isAuth = errorMessage.includes('authenticated') || errorMessage.includes('authorization');
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        clusters: []
      }),
      { 
        status: isAuth ? 401 : 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
