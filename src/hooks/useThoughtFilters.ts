import { useState } from 'react';
import { ThoughtWithCategories } from '@/types/thought.types';

export type SortBy = 'recent' | 'oldest' | 'title' | 'categories';

export function useThoughtFilters(thoughts: ThoughtWithCategories[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('recent');

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

  // Apply sorting based on sortBy
  const sortedFiltered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'categories':
        return (b.thought_categories?.length || 0) - (a.thought_categories?.length || 0);
      default:
        return 0;
    }
  });

  // For date-based sorts, keep the full sorted order (completed thoughts interspersed chronologically)
  // For non-date sorts, show active thoughts first, then completed thoughts
  let filteredThoughts: ThoughtWithCategories[];
  
  if (sortBy === 'recent' || sortBy === 'oldest') {
    // Keep chronological order intact - don't separate active/completed
    filteredThoughts = sortedFiltered;
  } else {
    // For title/categories sort, show active first, then completed
    const active = sortedFiltered.filter(t => !t.is_completed);
    const completed = sortedFiltered.filter(t => t.is_completed);
    filteredThoughts = [...active, ...completed];
  }

  return {
    searchQuery,
    setSearchQuery,
    selectedCategories,
    toggleCategoryFilter,
    sortBy,
    setSortBy,
    filteredThoughts
  };
}
