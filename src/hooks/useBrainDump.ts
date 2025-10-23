/**
 * @deprecated This hook has been refactored into smaller, more focused hooks.
 * Use the following hooks instead:
 * - useThoughts() for thought operations
 * - useCategories() for category operations
 * - useClusters() for cluster and connection operations
 * - useThoughtFilters() for filtering thoughts
 */

import { useThoughts } from './useThoughts';
import { useCategories } from './useCategories';
import { useClusters } from './useClusters';

export function useBrainDump() {
  const thoughtsHook = useThoughts();
  const categoriesHook = useCategories();
  const clustersHook = useClusters();

  return {
    ...thoughtsHook,
    ...categoriesHook,
    ...clustersHook,
    // Deprecated method - included for backward compatibility
    suggestCategories: async () => {
      console.warn('suggestCategories is deprecated and no longer used');
      return [];
    },
  };
}