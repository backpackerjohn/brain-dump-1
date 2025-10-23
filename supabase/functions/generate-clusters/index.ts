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

    // Fetch all active thoughts with their categories
    const { data: thoughts, error: fetchError } = await supabase
      .from('thoughts')
      .select(`
        id,
        title,
        snippet,
        content,
        thought_categories(
          categories(
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .is('thought_categories.cluster_id', null);

    if (fetchError) {
      console.error('Error fetching thoughts:', fetchError);
      throw fetchError;
    }

    if (!thoughts || thoughts.length === 0) {
      console.log('No unclustered thoughts found');
      return new Response(
        JSON.stringify({ clusters: [], message: 'No thoughts available for clustering' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${thoughts.length} unclustered thoughts`);

    // Group thoughts by category overlap
    const categoryMap = new Map<string, any[]>();
    
    for (const thought of thoughts) {
      const categories = thought.thought_categories?.map((tc: any) => tc.categories.name) || [];
      
      // Create a key from sorted categories
      const categoryKey = categories.sort().join('|') || 'Uncategorized';
      
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, []);
      }
      categoryMap.get(categoryKey)!.push({
        id: thought.id,
        title: thought.title,
        snippet: thought.snippet,
        categories
      });
    }

    console.log(`Found ${categoryMap.size} potential clusters`);

    // Create clusters for groups with 2+ thoughts
    const clustersToCreate = [];
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    for (const [categoryKey, thoughtGroup] of categoryMap.entries()) {
      if (thoughtGroup.length < 2) continue; // Skip single-thought groups

      console.log(`Processing cluster with ${thoughtGroup.length} thoughts`);

      // Use AI to generate a cluster name
      let clusterName = categoryKey === 'Uncategorized' ? 'Miscellaneous' : categoryKey.split('|').join(', ');

      if (LOVABLE_API_KEY) {
        try {
          const thoughtTitles = thoughtGroup.map(t => t.title).join('\n');
          const namePrompt = `Given these related thoughts, create a concise, descriptive cluster name (2-4 words):

${thoughtTitles}

Respond with ONLY the cluster name, nothing else.`;

          const nameResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: namePrompt }],
              max_tokens: 20
            }),
          });

          if (nameResponse.ok) {
            const nameData = await nameResponse.json();
            const generatedName = nameData.choices[0].message.content.trim();
            if (generatedName) {
              clusterName = generatedName;
            }
          }
        } catch (error) {
          console.error('Error generating cluster name:', error);
        }
      }

      clustersToCreate.push({
        name: clusterName,
        thoughtIds: thoughtGroup.map(t => t.id)
      });
    }

    console.log(`Creating ${clustersToCreate.length} clusters`);

    // Insert clusters and link thoughts
    const createdClusters = [];
    
    for (const cluster of clustersToCreate) {
      const { data: newCluster, error: clusterError } = await supabase
        .from('clusters')
        .insert({
          user_id: user.id,
          name: cluster.name
        })
        .select()
        .single();

      if (clusterError) {
        console.error('Error creating cluster:', clusterError);
        continue;
      }

      // Link thoughts to cluster
      const thoughtClusterLinks = cluster.thoughtIds.map(thoughtId => ({
        thought_id: thoughtId,
        cluster_id: newCluster.id
      }));

      const { error: linkError } = await supabase
        .from('thought_clusters')
        .insert(thoughtClusterLinks);

      if (linkError) {
        console.error('Error linking thoughts to cluster:', linkError);
      } else {
        createdClusters.push(newCluster);
      }
    }

    console.log(`Successfully created ${createdClusters.length} clusters`);

    return new Response(
      JSON.stringify({ clusters: createdClusters }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Error Generating Clusters ===');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('authenticated') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
