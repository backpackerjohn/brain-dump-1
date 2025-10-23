import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Cluster, Connection } from '@/types/thought.types';
import { TOAST_MESSAGES } from '@/utils/toast-messages';

export function useClusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const { toast } = useToast();

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
    try {
      const { data, error } = await supabase.functions.invoke('generate-clusters');

      if (error) throw error;

      toast(TOAST_MESSAGES.cluster.generated(data.clusters.length));
      await fetchClusters();
      return data.clusters;
    } catch (error: any) {
      toast(TOAST_MESSAGES.cluster.generateError(error.message));
      throw error;
    }
  };

  const findConnections = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('find-connections');

      if (error) throw error;
      setConnections(data.connections || []);
      return data.connections;
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
    generateClusters,
    findConnections
  };
}
