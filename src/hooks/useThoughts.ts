import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThoughtWithCategories } from '@/types/thought.types';
import { TOAST_MESSAGES } from '@/utils/toast-messages';

export function useThoughts() {
  const [thoughts, setThoughts] = useState<ThoughtWithCategories[]>([]);
  const [archivedThoughts, setArchivedThoughts] = useState<ThoughtWithCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const { toast } = useToast();

  const fetchThoughts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('thoughts')
        .select(`
          *,
          thought_categories(
            categories(*)
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setThoughts(data || []);
    } catch (error: any) {
      toast(TOAST_MESSAGES.thought.processError(error.message));
    }
  };

  const fetchArchivedThoughts = async () => {
    setIsLoadingArchive(true);
    try {
      const { data, error } = await (supabase as any)
        .from('thoughts')
        .select(`
          *,
          thought_categories(
            categories(*)
          )
        `)
        .eq('status', 'archived')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArchivedThoughts(data || []);
    } catch (error: any) {
      toast(TOAST_MESSAGES.thought.processError(error.message));
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const processThought = async (content: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-thought', {
        body: { content }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      const thoughtCount = data?.thoughts?.length || 0;
      const metadata = data?.metadata;

      // Show appropriate toast based on embedding success
      if (metadata && metadata.embeddings_failed > 0) {
        toast(TOAST_MESSAGES.thought.processedWithWarning(thoughtCount, metadata.embeddings_failed));
      } else {
        toast(TOAST_MESSAGES.thought.processed(thoughtCount));
      }

      await fetchThoughts();
      return data.thoughts;
    } catch (error: any) {
      console.error('Error processing thought:', error);

      let errorMessage = error.message || 'Failed to process thought';

      if (error.message?.includes('authenticated') || error.message?.includes('authorization')) {
        errorMessage = 'Your session has expired. Please sign in again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      }

      toast(TOAST_MESSAGES.thought.processError(errorMessage));
      throw error;
    }
  };

  const retryEmbeddings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('retry-embeddings');

      if (error) {
        console.error('Retry embeddings error:', error);
        throw error;
      }

      if (data.succeeded > 0) {
        toast({
          title: 'Embeddings generated',
          description: `Successfully generated ${data.succeeded} embedding(s)`
        });
        await fetchThoughts();
      } else if (data.retried === 0) {
        toast({
          title: 'No thoughts to retry',
          description: 'All thoughts already have embeddings'
        });
      } else {
        toast({
          title: 'Retry failed',
          description: 'Could not generate embeddings. Please try again later.',
          variant: 'destructive'
        });
      }

      return data;
    } catch (error: any) {
      toast({
        title: 'Error retrying embeddings',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const archiveThought = async (thoughtId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('thoughts')
        .update({ status: 'archived' })
        .eq('id', thoughtId);

      if (error) throw error;
      toast(TOAST_MESSAGES.thought.archived);
      await fetchThoughts();
    } catch (error: any) {
      toast(TOAST_MESSAGES.thought.archiveError(error.message));
    }
  };

  const restoreThought = async (thoughtId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('thoughts')
        .update({ status: 'active' })
        .eq('id', thoughtId);

      if (error) throw error;
      toast(TOAST_MESSAGES.thought.restored);
      await Promise.all([fetchThoughts(), fetchArchivedThoughts()]);
    } catch (error: any) {
      toast(TOAST_MESSAGES.thought.restoreError(error.message));
    }
  };

  const removeCategoryFromThought = async (thoughtId: string, categoryId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('thought_categories')
        .delete()
        .eq('thought_id', thoughtId)
        .eq('category_id', categoryId);

      if (error) throw error;
      toast(TOAST_MESSAGES.category.removed);
      await fetchThoughts();
    } catch (error: any) {
      toast(TOAST_MESSAGES.category.removeError(error.message));
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await fetchThoughts();
      setIsLoading(false);
    };

    initialize();

    const thoughtsChannel = supabase
      .channel('thoughts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'thoughts' },
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
    isLoading,
    isLoadingArchive,
    processThought,
    archiveThought,
    restoreThought,
    removeCategoryFromThought,
    fetchArchivedThoughts,
    retryEmbeddings
  };
}
