import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useBrainDump() {
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [archivedThoughts, setArchivedThoughts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const { toast } = useToast();

  const fetchThoughts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("thoughts")
        .select(`
          *,
          thought_categories(
            categories(*)
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setThoughts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching thoughts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchClusters = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("clusters")
        .select(`
          *,
          thought_clusters(
            thoughts(*)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClusters(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching clusters",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchArchivedThoughts = async () => {
    setIsLoadingArchive(true);
    try {
      const { data, error } = await (supabase as any)
        .from("thoughts")
        .select(`
          *,
          thought_categories(
            categories(*)
          )
        `)
        .eq("status", "archived")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArchivedThoughts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching archived thoughts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const processThought = async (content: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("process-thought", {
        body: { content },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      const thoughtCount = data?.thoughts?.length || 0;
      
      toast({
        title: "Thoughts processed",
        description: `${thoughtCount} thought(s) added`,
      });

      await fetchThoughts();
      await fetchCategories();
      return data.thoughts;
    } catch (error: any) {
      console.error('Error processing thought:', error);
      
      let errorMessage = error.message || 'Failed to process thought';
      
      if (error.message?.includes('authenticated') || error.message?.includes('authorization')) {
        errorMessage = 'Your session has expired. Please sign in again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      toast({
        title: "Error processing thought",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const suggestCategories = async (thoughtId: string, existingCategories: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("suggest-categories", {
        body: { thoughtId, existingCategories },
      });

      if (error) throw error;
      return data.categories;
    } catch (error: any) {
      toast({
        title: "Error suggesting categories",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const generateClusters = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-clusters");

      if (error) throw error;

      toast({
        title: "Clusters generated",
        description: `${data.clusters.length} cluster(s) created`,
      });

      await fetchClusters();
      return data.clusters;
    } catch (error: any) {
      toast({
        title: "Error generating clusters",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const findConnections = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("find-connections");

      if (error) throw error;
      setConnections(data.connections || []);
      return data.connections;
    } catch (error: any) {
      toast({
        title: "Error finding connections",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const archiveThought = async (thoughtId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("thoughts")
        .update({ status: "archived" })
        .eq("id", thoughtId);

      if (error) throw error;

      toast({
        title: "Thought archived",
        description: "You can restore it from the Archive tab",
      });

      await fetchThoughts();
    } catch (error: any) {
      toast({
        title: "Error archiving thought",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const restoreThought = async (thoughtId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("thoughts")
        .update({ status: "active" })
        .eq("id", thoughtId);

      if (error) throw error;

      toast({
        title: "Thought restored",
      });

      await Promise.all([fetchThoughts(), fetchArchivedThoughts()]);
    } catch (error: any) {
      toast({
        title: "Error restoring thought",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeCategoryFromThought = async (thoughtId: string, categoryId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("thought_categories")
        .delete()
        .eq("thought_id", thoughtId)
        .eq("category_id", categoryId);

      if (error) throw error;

      toast({
        title: "Category removed",
      });

      await fetchThoughts();
    } catch (error: any) {
      toast({
        title: "Error removing category",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await Promise.all([fetchThoughts(), fetchCategories(), fetchClusters()]);
      setIsLoading(false);
    };

    initialize();

    // Subscribe to real-time updates
    const thoughtsChannel = supabase
      .channel("thoughts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "thoughts" },
        () => fetchThoughts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(thoughtsChannel);
    };
  }, []);

  return {
    thoughts,
    archivedThoughts,
    categories,
    clusters,
    connections,
    isLoading,
    isLoadingArchive,
    processThought,
    suggestCategories,
    generateClusters,
    findConnections,
    archiveThought,
    restoreThought,
    removeCategoryFromThought,
    fetchArchivedThoughts,
  };
}