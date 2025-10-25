import { useMemo } from 'react';
import { Category, ThoughtWithCategories } from '@/types/thought.types';

export function useCategoryUsage(categories: Category[], thoughts: ThoughtWithCategories[]) {
  return useMemo(() => {
    return categories.map(cat => {
      const count = thoughts.filter(t => 
        t.thought_categories?.some(tc => tc.categories.id === cat.id)
      ).length;
      return { ...cat, usage_count: count };
    }).sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
  }, [categories, thoughts]);
}

