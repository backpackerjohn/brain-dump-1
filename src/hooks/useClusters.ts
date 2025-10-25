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
      const { data, error } = await supabase
        .from('clusters')
        .select(`
          *,
          thought_clusters(
            thoughts(
              *,
              thought_categories(
                categories(*)
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClusters(data as any || []);
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

      const clusterCount = (data as any).clusters?.length || 0;
      if (clusterCount > 0) {
        toast({
          title: "Success!",
          description: `AI organized your thoughts into ${clusterCount} new cluster${clusterCount !== 1 ? 's' : ''}.`,
        });
      } else if ((data as any).message) {
        toast({
          title: "No clusters created",
          description: (data as any).message,
        });
      }
      
      await fetchClusters();
      return (data as any).clusters || [];
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

  const checkClusterCompletion = (cluster: Cluster) => {
    if (!cluster.thought_clusters || cluster.thought_clusters.length === 0) {
      return { completed: 0, total: 0, isFullyCompleted: false };
    }
    
    const activeThoughts = cluster.thought_clusters.filter(
      tc => tc.thoughts.status === 'active'
    );
    
    const completedThoughts = activeThoughts.filter(
      tc => tc.thoughts.is_completed
    );
    
    return {
      completed: completedThoughts.length,
      total: activeThoughts.length,
      isFullyCompleted: activeThoughts.length > 0 && 
                        completedThoughts.length === activeThoughts.length
    };
  };

  const archiveCluster = async (clusterId: string) => {
    try {
      const cluster = clusters.find(c => c.id === clusterId);
      if (!cluster?.thought_clusters) return;
      
      const thoughtIds = cluster.thought_clusters.map(tc => tc.thoughts.id);
      
      await Promise.all(
        thoughtIds.map(id =>
          supabase
            .from('thoughts')
            .update({ status: 'archived' })
            .eq('id', id)
        )
      );
      
      toast({
        title: 'Cluster archived',
        description: `"${cluster.name}" and all its thoughts moved to archive`
      });
      
      await fetchClusters();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
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
    findConnections,
    checkClusterCompletion,
    archiveCluster
  };
}
