import { Button } from '@/components/ui/button';
import { FilterPanel } from './FilterPanel';
import { ThoughtList } from './ThoughtList';
import { Category, ThoughtWithCategories } from '@/types/thought.types';
import { SortBy } from '@/hooks/useThoughtFilters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

interface AllThoughtsTabProps {
  thoughts: ThoughtWithCategories[];
  categories: Category[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  selectedThoughts: string[];
  onToggleSelect: (id: string) => void;
  onBulkArchive: () => void;
  onArchive: (id: string) => void;
  onRemoveCategory: (thoughtId: string, categoryId: string) => void;
  onMarkDone?: (id: string) => void;
  onEdit?: (id: string) => void;
  onAddCategory?: (thoughtId: string) => void;
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
}

export function AllThoughtsTab({
  thoughts,
  categories,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoryToggle,
  isSelectMode,
  onToggleSelectMode,
  selectedThoughts,
  onToggleSelect,
  onBulkArchive,
  onArchive,
  onRemoveCategory,
  onMarkDone,
  onEdit,
  onAddCategory,
  sortBy,
  onSortChange
}: AllThoughtsTabProps) {
  return (
    <>
      <FilterPanel
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoryToggle={onCategoryToggle}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isSelectMode={isSelectMode}
        onToggleSelectMode={onToggleSelectMode}
        selectedCount={selectedThoughts.length}
        thoughts={thoughts}
      />

      {/* Sort and Count Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''}
        </p>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="title">Title (A-Z)</SelectItem>
            <SelectItem value="categories">Most Categorized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isSelectMode && selectedThoughts.length > 0 && (
        <div className="flex gap-2 mb-4">
          <Button onClick={onBulkArchive} variant="destructive">
            Archive Selected ({selectedThoughts.length})
          </Button>
        </div>
      )}

      <ThoughtList
        thoughts={thoughts}
        isLoading={isLoading}
        isSelectMode={isSelectMode}
        selectedThoughts={selectedThoughts}
        onToggleSelect={onToggleSelect}
        onArchive={onArchive}
        onRemoveCategory={onRemoveCategory}
        onMarkDone={onMarkDone}
        onEdit={onEdit}
        onAddCategory={onAddCategory}
      />
    </>
  );
}
