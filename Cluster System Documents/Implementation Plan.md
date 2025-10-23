# Cluster System - Detailed Implementation Plan

## Overview
This document provides step-by-step implementation instructions to transform the current basic clustering system into the intelligent, collaborative system specified in the design documents.

---

## File-by-File Changes

### 📁 **1. Backend: `supabase/functions/generate-clusters/index.ts`**

**Action**: Complete rewrite of clustering logic

#### Changes Required:

**A. Add Threshold Validation**
```typescript
// After fetching unclustered thoughts, add:
if (thoughts.length < 10) {
  return new Response(
    JSON.stringify({ 
      clusters: [], 
      message: 'Need at least 10 thoughts to generate clusters' 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**B. Implement Chunking Protocol**
```typescript
const CHUNK_SIZE = 200;
const chunks: any[][] = [];
for (let i = 0; i < thoughts.length; i += CHUNK_SIZE) {
  chunks.push(thoughts.slice(i, i + CHUNK_SIZE));
}

let existingClusterNames: string[] = [];
const allClustersToCreate: { name: string; thoughtIds: string[] }[] = [];

for (const chunk of chunks) {
  // Process each chunk
  const clustersFromChunk = await processChunkWithAI(chunk, existingClusterNames);
  allClustersToCreate.push(...clustersFromChunk);
  
  // Update existing cluster names for next iteration
  existingClusterNames = allClustersToCreate.map(c => c.name);
}
```

**C. Replace with Gemini Structured Prompt**
```typescript
async function processChunkWithAI(
  thoughts: any[], 
  existingClusters: string[]
): Promise<{ name: string; thoughtIds: string[] }[]> {
  
  const thoughtsList = thoughts.map(t => ({
    id: t.id,
    text: `${t.title}: ${t.content || t.snippet || ''}`
  }));

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
${JSON.stringify(thoughtsList)}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
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
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`AI clustering failed: ${response.status}`);
  }

  const data = await response.json();
  const clusters = data.choices?.[0]?.message?.content;
  
  if (typeof clusters === 'string') {
    const parsed = JSON.parse(clusters);
    return parsed.clusters || [];
  } else if (clusters?.clusters) {
    return clusters.clusters;
  }
  
  return [];
}
```

**D. Remove Old Embedding-Based Logic**
- Remove cosine similarity functions
- Remove embedding generation in this function (keep it in process-thought)
- Remove category-based fallback
- Keep only the AI-based semantic clustering

---

### 📁 **2. Backend: Create `supabase/functions/find-related-thoughts/index.ts`**

**Action**: New edge function for collaboration loop

```typescript
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
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { clusterId } = await req.json();
    
    if (!clusterId) {
      throw new Error('clusterId is required');
    }

    // Get thoughts in this cluster (as examples)
    const { data: clusterThoughts, error: clusterError } = await supabase
      .from('thought_clusters')
      .select(`
        thoughts (
          id,
          title,
          content,
          snippet
        )
      `)
      .eq('cluster_id', clusterId);

    if (clusterError) throw clusterError;

    if (!clusterThoughts || clusterThoughts.length < 2) {
      return new Response(
        JSON.stringify({ relatedThoughts: [], message: 'Need at least 2 thoughts in cluster' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all unclustered thoughts
    const { data: allThoughts, error: thoughtsError } = await supabase
      .from('thoughts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (thoughtsError) throw thoughtsError;

    const allThoughtIds = allThoughts?.map(t => t.id) || [];
    
    const { data: clustered, error: clusteredError } = await supabase
      .from('thought_clusters')
      .select('thought_id')
      .in('thought_id', allThoughtIds);

    if (clusteredError) throw clusteredError;

    const clusteredIds = new Set(clustered?.map(c => c.thought_id) || []);
    const unclusteredIds = allThoughtIds.filter(id => !clusteredIds.has(id));

    if (unclusteredIds.length === 0) {
      return new Response(
        JSON.stringify({ relatedThoughts: [], message: 'No unclustered thoughts available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: unclusteredThoughts, error: unclusteredError } = await supabase
      .from('thoughts')
      .select('id, title, content, snippet')
      .in('id', unclusteredIds);

    if (unclusteredError) throw unclusteredError;

    // Use AI to find related thoughts
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const exampleTexts = clusterThoughts
      .map(ct => `${ct.thoughts.title}: ${ct.thoughts.content || ct.thoughts.snippet || ''}`)
      .join('\n\n');

    const candidateThoughts = unclusteredThoughts.map(t => ({
      id: t.id,
      text: `${t.title}: ${t.content || t.snippet || ''}`
    }));

    const prompt = `You are helping a user organize their thoughts. They have manually created a cluster with the following thoughts as examples:

**Example Thoughts in Cluster:**
${exampleTexts}

**Unclustered Thoughts to Evaluate:**
${JSON.stringify(candidateThoughts)}

**Task:**
From the list of unclustered thoughts, identify which ones are thematically similar to the example thoughts. Only select thoughts that clearly relate to the same project, topic, goal, or context.

Return your answer as a JSON array of thought IDs that should be added to this cluster. Be selective - only include thoughts that genuinely fit the theme.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp',
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'related_thoughts',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                thoughtIds: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['thoughtIds'],
              additionalProperties: false
            }
          }
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    let thoughtIds: string[] = [];
    
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      const parsed = JSON.parse(content);
      thoughtIds = parsed.thoughtIds || [];
    } else if (content?.thoughtIds) {
      thoughtIds = content.thoughtIds;
    }

    // Validate IDs exist in unclustered set
    const validIds = thoughtIds.filter(id => unclusteredIds.includes(id));

    // Automatically add them to the cluster
    if (validIds.length > 0) {
      const links = validIds.map(thoughtId => ({
        thought_id: thoughtId,
        cluster_id: clusterId
      }));

      const { error: linkError } = await supabase
        .from('thought_clusters')
        .insert(links);

      if (linkError) {
        console.error('Error linking thoughts:', linkError);
      }
    }

    return new Response(
      JSON.stringify({ 
        relatedThoughts: validIds,
        count: validIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error finding related thoughts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### 📁 **3. Frontend Hook: `src/hooks/useClusters.ts`**

**Action**: Enhance to support threshold checking and manual clustering

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Cluster, Connection, ThoughtWithCategories } from '@/types/thought.types';
import { TOAST_MESSAGES } from '@/utils/toast-messages';

export function useClusters(thoughts: ThoughtWithCategories[]) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [unclusteredThoughts, setUnclusteredThoughts] = useState<ThoughtWithCategories[]>([]);
  const [unclusteredCount, setUnclusteredCount] = useState(0);
  const { toast } = useToast();

  // Calculate unclustered thoughts
  useEffect(() => {
    const clusteredIds = new Set<string>();
    clusters.forEach(cluster => {
      cluster.thought_clusters?.forEach(tc => {
        clusteredIds.add(tc.thoughts.id);
      });
    });

    const unclustered = thoughts.filter(t => !clusteredIds.has(t.id));
    setUnclusteredThoughts(unclustered);
    setUnclusteredCount(unclustered.length);
  }, [thoughts, clusters]);

  const fetchClusters = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('clusters')
        .select(`
          *,
          thought_clusters(
            thoughts(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClusters(data || []);
    } catch (error: any) {
      toast(TOAST_MESSAGES.cluster.fetchError(error.message));
    }
  };

  const generateClusters = async () => {
    if (unclusteredCount < 10) {
      toast({
        title: "Not enough thoughts",
        description: `You need at least 10 unclustered thoughts. You currently have ${unclusteredCount}.`,
        variant: "destructive"
      });
      return [];
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-clusters');

      if (error) throw error;

      if (!data || (data as any).error) {
        const message = (data as any)?.error || 'Failed to generate clusters';
        toast(TOAST_MESSAGES.cluster.generateError(message));
        return [];
      }

      const clusterCount = (data as any).clusters.length;
      toast({
        title: "Success!",
        description: `AI organized your thoughts into ${clusterCount} new cluster${clusterCount !== 1 ? 's' : ''}.`,
      });
      
      await fetchClusters();
      return (data as any).clusters;
    } catch (error: any) {
      toast(TOAST_MESSAGES.cluster.generateError(error.message));
      throw error;
    }
  };

  const createManualCluster = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('clusters')
        .insert({ 
          user_id: user.id, 
          name,
          is_manual: true 
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Cluster created",
        description: `Created cluster "${name}"`,
      });

      await fetchClusters();
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const renameCluster = async (clusterId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('clusters')
        .update({ name: newName })
        .eq('id', clusterId);

      if (error) throw error;

      toast({
        title: "Cluster renamed",
        description: `Renamed to "${newName}"`,
      });

      await fetchClusters();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const addThoughtToCluster = async (thoughtId: string, clusterId: string) => {
    try {
      const { error } = await supabase
        .from('thought_clusters')
        .insert({
          thought_id: thoughtId,
          cluster_id: clusterId
        });

      if (error) throw error;
      await fetchClusters();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const removeThoughtFromCluster = async (thoughtId: string, clusterId: string) => {
    try {
      const { error } = await supabase
        .from('thought_clusters')
        .delete()
        .eq('thought_id', thoughtId)
        .eq('cluster_id', clusterId);

      if (error) throw error;
      await fetchClusters();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const findRelatedThoughts = async (clusterId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('find-related-thoughts', {
        body: { clusterId }
      });

      if (error) throw error;

      const count = data?.count || 0;
      if (count > 0) {
        toast({
          title: "Found related thoughts",
          description: `Added ${count} related thought${count !== 1 ? 's' : ''} to this cluster.`,
        });
        await fetchClusters();
      } else {
        toast({
          title: "No related thoughts found",
          description: "Couldn't find any unclustered thoughts that match this cluster's theme.",
        });
      }

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const findConnections = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('find-connections');

      if (error) throw error;
      const foundConnections = data.connections || [];
      setConnections(foundConnections);
      
      if (foundConnections.length > 0) {
        toast(TOAST_MESSAGES.connection.found(foundConnections.length));
      }
      
      return foundConnections;
    } catch (error: any) {
      toast(TOAST_MESSAGES.connection.findError(error.message));
      throw error;
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  return {
    clusters,
    connections,
    unclusteredThoughts,
    unclusteredCount,
    generateClusters,
    createManualCluster,
    renameCluster,
    addThoughtToCluster,
    removeThoughtFromCluster,
    findRelatedThoughts,
    findConnections
  };
}
```

---

### 📁 **4. Frontend Component: `src/components/brain-dump/ClustersTab.tsx`**

**Action**: Complete redesign with conditional rendering and new features

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThoughtCard } from './ThoughtCard';
import { Cluster, ThoughtWithCategories } from '@/types/thought.types';
import { 
  ChevronDown, 
  ChevronRight, 
  Pencil, 
  Check, 
  X, 
  Plus,
  Sparkles,
  Search
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ClustersTabProps {
  clusters: Cluster[];
  unclusteredCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
  onArchive: (id: string) => void;
  onCreateManualCluster: (name: string) => void;
  onRenameCluster: (clusterId: string, newName: string) => void;
  onFindRelated: (clusterId: string) => void;
  isFindingRelated?: string | null;
}

export function ClustersTab({ 
  clusters, 
  unclusteredCount,
  isGenerating, 
  onGenerate, 
  onArchive,
  onCreateManualCluster,
  onRenameCluster,
  onFindRelated,
  isFindingRelated
}: ClustersTabProps) {
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set());
  const [editingCluster, setEditingCluster] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creatingCluster, setCreatingCluster] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');

  const toggleCluster = (clusterId: string) => {
    setOpenClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const startEdit = (cluster: Cluster) => {
    setEditingCluster(cluster.id);
    setEditName(cluster.name);
  };

  const cancelEdit = () => {
    setEditingCluster(null);
    setEditName('');
  };

  const saveEdit = (clusterId: string) => {
    if (editName.trim()) {
      onRenameCluster(clusterId, editName.trim());
    }
    setEditingCluster(null);
    setEditName('');
  };

  const handleCreateCluster = () => {
    if (newClusterName.trim()) {
      onCreateManualCluster(newClusterName.trim());
      setNewClusterName('');
      setCreatingCluster(false);
    }
  };

  const getThoughtCount = (cluster: Cluster) => {
    return cluster.thought_clusters?.length || 0;
  };

  // Show empty state if user has < 10 unclustered thoughts and no clusters
  if (unclusteredCount < 10 && clusters.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Clusters of related thoughts will appear here
              </h3>
              <p className="text-muted-foreground">
                Add at least 10 thoughts to enable AI-powered organization.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Currently: {unclusteredCount} thought{unclusteredCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        {unclusteredCount >= 10 && (
          <Button 
            onClick={onGenerate} 
            disabled={isGenerating} 
            className="flex-1"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                Analyzing your thoughts...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                ✨ You have {unclusteredCount} unclustered thoughts. Let AI find the patterns.
              </>
            )}
          </Button>
        )}
        
        {!creatingCluster ? (
          <Button 
            onClick={() => setCreatingCluster(true)}
            variant="outline"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Cluster
          </Button>
        ) : (
          <div className="flex gap-2 flex-1">
            <Input
              value={newClusterName}
              onChange={(e) => setNewClusterName(e.target.value)}
              placeholder="Enter cluster name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCluster();
                if (e.key === 'Escape') {
                  setCreatingCluster(false);
                  setNewClusterName('');
                }
              }}
              autoFocus
            />
            <Button onClick={handleCreateCluster} size="icon">
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => {
                setCreatingCluster(false);
                setNewClusterName('');
              }} 
              variant="ghost" 
              size="icon"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isGenerating && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="text-center space-y-2">
            <Sparkles className="h-8 w-8 animate-pulse mx-auto text-primary" />
            <p className="text-sm font-medium">
              AI is finding hidden connections...
            </p>
          </div>
        </Card>
      )}

      {/* Clusters List */}
      {clusters.length === 0 && !isGenerating ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              No clusters yet. {unclusteredCount >= 10 
                ? "Click the button above to generate semantic groupings." 
                : `Add ${10 - unclusteredCount} more thought${10 - unclusteredCount !== 1 ? 's' : ''} to enable clustering.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => {
            const isOpen = openClusters.has(cluster.id);
            const thoughtCount = getThoughtCount(cluster);
            const isEditing = editingCluster === cluster.id;
            const isFinding = isFindingRelated === cluster.id;

            return (
              <Collapsible
                key={cluster.id}
                open={isOpen}
                onOpenChange={() => toggleCluster(cluster.id)}
              >
                <Card className="overflow-hidden">
                  <div className="p-4 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3 flex-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(cluster.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button 
                            onClick={() => saveEdit(cluster.id)} 
                            size="icon" 
                            className="h-8 w-8"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={cancelEdit} 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold flex-1">
                            {cluster.name}
                          </h3>
                          <Button
                            onClick={() => startEdit(cluster)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-muted-foreground">
                        {thoughtCount} thought{thoughtCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="p-6 space-y-4">
                      {/* Find Related Button (show if cluster has 2+ thoughts) */}
                      {thoughtCount >= 2 && unclusteredCount > 0 && (
                        <Button
                          onClick={() => onFindRelated(cluster.id)}
                          disabled={isFinding}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          {isFinding 
                            ? 'Finding related thoughts...' 
                            : `Find related thoughts (${unclusteredCount} available)`
                          }
                        </Button>
                      )}

                      {/* Thoughts Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cluster.thought_clusters?.map((tc) => (
                          <ThoughtCard
                            key={tc.thoughts.id}
                            thought={tc.thoughts}
                            onArchive={onArchive}
                          />
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

### 📁 **5. Parent Component: `src/pages/BrainDump.tsx`**

**Action**: Update to pass thoughts and handle new cluster functions

```typescript
// Update useClusters call:
const { 
  clusters, 
  connections, 
  unclusteredCount,
  generateClusters, 
  findConnections,
  createManualCluster,
  renameCluster,
  findRelatedThoughts
} = useClusters(thoughts);

// Add state for finding related thoughts
const [isFindingRelated, setIsFindingRelated] = useState<string | null>(null);

// Add handlers
const handleCreateManualCluster = async (name: string) => {
  try {
    await createManualCluster(name);
  } catch (error) {
    console.error('Error creating cluster:', error);
  }
};

const handleRenameCluster = async (clusterId: string, newName: string) => {
  try {
    await renameCluster(clusterId, newName);
  } catch (error) {
    console.error('Error renaming cluster:', error);
  }
};

const handleFindRelated = async (clusterId: string) => {
  setIsFindingRelated(clusterId);
  try {
    await findRelatedThoughts(clusterId);
  } finally {
    setIsFindingRelated(null);
  }
};

// Update ClustersTab component:
<TabsContent value="clusters">
  <ClustersTab
    clusters={clusters}
    unclusteredCount={unclusteredCount}
    isGenerating={isGeneratingClusters}
    onGenerate={handleGenerateClusters}
    onArchive={archiveThought}
    onCreateManualCluster={handleCreateManualCluster}
    onRenameCluster={handleRenameCluster}
    onFindRelated={handleFindRelated}
    isFindingRelated={isFindingRelated}
  />
</TabsContent>
```

---

### 📁 **6. Database Migration: Add `is_manual` field**

**Action**: Create new migration file

```sql
-- Add is_manual column to clusters table
ALTER TABLE public.clusters 
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

-- Add index for manual clusters
CREATE INDEX IF NOT EXISTS idx_clusters_is_manual 
ON public.clusters (is_manual);
```

---

### 📁 **7. Types Update: `src/types/thought.types.ts`**

**Action**: Add is_manual field

```typescript
export interface Cluster {
  id: string;
  name: string;
  is_manual?: boolean;
  is_collapsed?: boolean;
  created_at: string;
  updated_at?: string;
  thought_clusters?: Array<{
    thoughts: ThoughtWithCategories;
  }>;
}
```

---

## Testing Checklist

### Phase 1: Threshold & Basic AI
- [ ] Cluster button hidden when < 10 unclustered thoughts
- [ ] Empty state shows correct message
- [ ] Button shows count when >= 10 thoughts
- [ ] Generate clusters uses new AI prompt
- [ ] Clusters created successfully with good names
- [ ] Toast shows correct cluster count

### Phase 2: Chunking
- [ ] Create 250+ test thoughts
- [ ] Verify chunking activates at 200+
- [ ] Verify subsequent chunks see existing cluster names
- [ ] No duplicate clusters created
- [ ] All thoughts properly assigned

### Phase 3: Manual Clusters
- [ ] Can create manual cluster
- [ ] Can rename cluster
- [ ] Cluster marked as manual in DB
- [ ] Find related button appears when >= 2 thoughts
- [ ] Find related successfully adds thoughts

### Phase 4: UX
- [ ] Loading states show descriptive messages
- [ ] Clusters are collapsible
- [ ] Edit mode works correctly
- [ ] All toasts are informative
- [ ] Empty states guide users

---

## Rollout Strategy

1. **Backend First**: Deploy edge function changes
2. **Test Backend**: Use Postman/curl to verify AI responses
3. **Frontend Hook**: Update useClusters
4. **UI Components**: Update ClustersTab
5. **Integration**: Connect BrainDump page
6. **Migration**: Run database migration
7. **Testing**: Full E2E testing
8. **Documentation**: Update user docs

---

## Rollback Plan

If issues arise:
1. Keep old `generate-clusters` as `generate-clusters-legacy`
2. Feature flag in frontend to switch between old/new
3. Database changes are additive (won't break existing data)
4. Can revert frontend changes without backend impact

---

## Success Metrics

- ✅ Zero cluster generation attempts with < 10 thoughts
- ✅ Successful processing of 1000+ thought datasets
- ✅ User creates at least 1 manual cluster per session
- ✅ Find related thoughts has >70% accuracy (user doesn't immediately remove thoughts)
- ✅ Cluster names are descriptive (not generic "Related Ideas")
- ✅ Loading states never show "undefined" or errors

