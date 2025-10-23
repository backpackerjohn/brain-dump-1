import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cosine similarity helpers for simple clustering on small N
function dot(a: number[], b: number[]) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function norm(a: number[]) {
  let s = 0;
  for (const v of a) s += v * v;
  return Math.sqrt(s);
}

function cosineSim(a: number[], b: number[]) {
  const d = norm(a) * norm(b);
  if (d === 0) return 0;
  return dot(a, b) / d;
}

function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed as number[];
    } catch (_) {
      // not JSON; PostgREST may serialize vectors as strings like "[0.1,0.2]"
      if (v.startsWith('[') && v.endsWith(']')) {
        try {
          const parsed2 = JSON.parse(v);
          if (Array.isArray(parsed2)) return parsed2 as number[];
        } catch {}
      }
    }
  }
  return null;
}

function clusterByThreshold(ids: string[], vectors: number[][], threshold = 0.75): string[][] {
  const n = vectors.length;
  if (n < 2) return [];
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (cosineSim(vectors[i], vectors[j]) >= threshold) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  const visited = new Array(n).fill(false);
  const clusters: string[][] = [];
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const stack = [i];
    visited[i] = true;
    const groupIdx: number[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      groupIdx.push(cur);
      for (const nb of adj[cur]) {
        if (!visited[nb]) {
          visited[nb] = true;
          stack.push(nb);
        }
      }
    }
    if (groupIdx.length >= 2) clusters.push(groupIdx.map((k) => ids[k]));
  }
  return clusters;
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

    // Fetch all active thoughts with their categories and existing embeddings
    const { data: thoughtsRaw, error: fetchError } = await supabase
      .from('thoughts')
      .select(`
        id,
        title,
        snippet,
        content,
        embedding,
        thought_categories(
          categories(
            id,
            name
          )
        )
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
        .from('thought_clusters')
        .select('thought_id')
        .in('thought_id', ids);
      if (linksError) {
        console.error('Error fetching existing cluster links:', linksError);
        throw linksError;
      }
      const linked = new Set((links || []).map((l: any) => l.thought_id));
      thoughts = thoughts.filter((t: any) => !linked.has(t.id));
    }

    if (!thoughts || thoughts.length === 0) {
      console.log('No unclustered thoughts found');
      return new Response(
        JSON.stringify({ clusters: [], message: 'No thoughts available for clustering' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${thoughts.length} unclustered thoughts`);

    // Ensure embeddings exist (lazy-embed if missing)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const EMBEDDING_MODEL = 'google/text-embedding-004';

    const localVectors = new Map<string, number[]>();
    const toEmbed: { id: string; text: string }[] = [];
    for (const t of thoughts) {
      const v = parseVector(t.embedding);
      if (v && v.length > 0) {
        localVectors.set(t.id, v);
      } else {
        const text = (t.content ?? t.snippet ?? t.title ?? '').toString();
        if (text.trim().length > 0) toEmbed.push({ id: t.id, text });
      }
    }

    if (toEmbed.length > 0 && LOVABLE_API_KEY) {
      try {
        console.log(`Embedding ${toEmbed.length} thoughts...`);
        const embedResp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: EMBEDDING_MODEL, input: toEmbed.map((x) => x.text) })
        });
        let embedData: any = null;
        if (!embedResp.ok) {
          const errText = await embedResp.text().catch(() => '');
          console.error('Embedding API error (primary model):', EMBEDDING_MODEL, embedResp.status, errText);
          // Try an alternate model once
          const ALT_MODEL = 'google/text-embedding-005';
          const altResp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: ALT_MODEL, input: toEmbed.map((x) => x.text) })
          });
          if (!altResp.ok) {
            const altErr = await altResp.text().catch(() => '');
            console.error('Embedding API error (alternate model):', ALT_MODEL, altResp.status, altErr);
            throw new Error(`Embedding request failed (primary ${embedResp.status}, alt ${altResp.status})`);
          }
          embedData = await altResp.json();
        } else {
          embedData = await embedResp.json();
        }
        const items = Array.isArray(embedData.data) ? embedData.data : [];
        if (items.length !== toEmbed.length) {
          console.warn('Embedding response length mismatch');
        }
        for (let i = 0; i < toEmbed.length; i++) {
          const id = toEmbed[i].id;
          const emb = items[i]?.embedding;
          if (Array.isArray(emb)) {
            localVectors.set(id, emb as number[]);
            // Mark success without persisting vector to avoid pgvector serialization issues
            await supabase
              .from('thoughts')
              .update({
                embedding_failed: false,
                last_embedding_attempt: new Date().toISOString(),
              })
              .eq('id', id);
          } else {
            await supabase
              .from('thoughts')
              .update({
                embedding_failed: true,
                last_embedding_attempt: new Date().toISOString(),
              })
              .eq('id', id);
          }
        }
      } catch (e) {
        console.error('Embedding step failed, falling back to categories:', e);
      }
    }

    // Build clusters
    const idList: string[] = [];
    const vecList: number[][] = [];
    for (const t of thoughts) {
      const v = localVectors.get(t.id);
      if (v) {
        idList.push(t.id);
        vecList.push(v);
      }
    }

    const clustersToCreate: { name: string; thoughtIds: string[] }[] = [];
    if (vecList.length >= 2) {
      // Embedding-based grouping using connected components at similarity threshold
      const groups = clusterByThreshold(idList, vecList, 0.75);
      console.log(`Embedding clustering produced ${groups.length} group(s)`);
      for (const group of groups) {
        // Generate a name using thought titles
        let clusterName = 'Related Ideas';
        if (LOVABLE_API_KEY) {
          try {
            const titles = thoughts
              .filter((t: any) => group.includes(t.id))
              .map((t: any) => t.title)
              .join('\n');
            const namePrompt = `Given these related thoughts, create a concise, descriptive cluster name (2-4 words):\n\n${titles}\n\nRespond with ONLY the cluster name, nothing else.`;
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
              const generatedName = nameData.choices?.[0]?.message?.content?.trim();
              if (generatedName) clusterName = generatedName;
            }
          } catch (err) {
            console.error('Error generating cluster name:', err);
          }
        }
        clustersToCreate.push({ name: clusterName, thoughtIds: group });
      }
    }

    // Fallback: category grouping if no embedding clusters
    if (clustersToCreate.length === 0) {
      const categoryMap = new Map<string, any[]>();
      for (const thought of thoughts) {
        const categories = thought.thought_categories?.map((tc: any) => tc.categories.name) || [];
        const categoryKey = categories.sort().join('|') || 'Uncategorized';
        if (!categoryMap.has(categoryKey)) categoryMap.set(categoryKey, []);
        categoryMap.get(categoryKey)!.push({ id: thought.id, title: thought.title });
      }
      for (const [categoryKey, thoughtGroup] of categoryMap.entries()) {
        if (thoughtGroup.length < 2) continue;
        let clusterName = categoryKey === 'Uncategorized' ? 'Miscellaneous' : categoryKey.split('|').join(', ');
        if (LOVABLE_API_KEY) {
          try {
            const thoughtTitles = thoughtGroup.map((t: any) => t.title).join('\n');
            const namePrompt = `Given these related thoughts, create a concise, descriptive cluster name (2-4 words):\n\n${thoughtTitles}\n\nRespond with ONLY the cluster name, nothing else.`;
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
              const generatedName = nameData.choices?.[0]?.message?.content?.trim();
              if (generatedName) clusterName = generatedName;
            }
          } catch (error) {
            console.error('Error generating cluster name:', error);
          }
        }
        clustersToCreate.push({
          name: clusterName,
          thoughtIds: thoughtGroup.map((t: any) => t.id)
        });
      }
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
    const isAuth = errorMessage.includes('authenticated') || errorMessage.includes('authorization');
    const payload = { error: errorMessage };
    // Preserve 401 for auth errors; otherwise return 200 with error payload so UI doesn't get a generic non-2xx
    const status = isAuth ? 401 : 200;
    return new Response(
      JSON.stringify(payload),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
