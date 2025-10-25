import { useState } from 'react';
import { ThoughtWithCategories } from '@/types/thought.types';

export function useThoughtFilters(thoughts: ThoughtWithCategories[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filtered = thoughts.filter((thought) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !thought.title.toLowerCase().includes(query) &&
        !thought.snippet?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    if (selectedCategories.length > 0) {
      const thoughtCategoryIds =
        thought.thought_categories?.map((tc) => tc.categories.id) || [];
      if (!selectedCategories.some((catId) => thoughtCategoryIds.includes(catId))) {
        return false;
      }
    }

    return true;
  });

  // Sort thoughts: active first, completed last
  const active = filtered.filter(t => !t.is_completed);
  const completed = filtered.filter(t => t.is_completed);
  
  const filteredThoughts = [
    ...active.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    ...completed.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  ];

  return {
    searchQuery,
    setSearchQuery,
    selectedCategories,
    toggleCategoryFilter,
    filteredThoughts
  };
}
