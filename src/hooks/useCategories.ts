import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/types/thought.types';
import { TOAST_MESSAGES } from '@/utils/toast-messages';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast(TOAST_MESSAGES.category.fetchError(error.message));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    fetchCategories
  };
}
