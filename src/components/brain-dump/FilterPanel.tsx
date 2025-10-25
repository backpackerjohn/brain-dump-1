import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { ThoughtWithCategories } from "@/types/thought.types";
import { useCategoryUsage } from "@/hooks/useCategoryUsage";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  categories: Array<{ id: string; name: string; usage_count?: number }>;
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  selectedCount: number;
  thoughts: ThoughtWithCategories[];
}

export function FilterPanel({
  categories,
  selectedCategories,
  onCategoryToggle,
  searchQuery,
  onSearchChange,
  isSelectMode,
  onToggleSelectMode,
  selectedCount,
  thoughts,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // Calculate usage counts for categories
  const categoriesWithUsage = useCategoryUsage(categories, thoughts);

  // Filter categories by search query
  const filteredCategories = categorySearch
    ? categoriesWithUsage.filter(c => 
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
      )
    : categoriesWithUsage;

  // Show top 8 by default, all when expanded or searching
  const displayedCategories = (isExpanded || categorySearch)
    ? filteredCategories
    : filteredCategories.slice(0, 8);

  const hasMore = filteredCategories.length > 8;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search thoughts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant={isSelectMode ? "default" : "outline"}
          onClick={onToggleSelectMode}
        >
          {isSelectMode ? `Cancel (${selectedCount})` : "Select"}
        </Button>
      </div>

      {/* Category Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filter Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Filter by category
            {selectedCategories.length > 0 && (
              <span className="ml-1">({selectedCategories.length} selected)</span>
            )}
          </span>
          {hasMore && !categorySearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs h-auto py-1"
            >
              {isExpanded ? 'Show Less' : `Show All (${categoriesWithUsage.length})`}
            </Button>
          )}
        </div>
        
        <div className={cn(
          "flex flex-wrap gap-2 overflow-y-auto",
          !isExpanded && !categorySearch && "max-h-32"
        )}>
          {displayedCategories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onCategoryToggle(category.id)}
            >
              {category.name}
              {category.usage_count !== undefined && category.usage_count > 0 && (
                <span className="ml-1 text-xs opacity-70">({category.usage_count})</span>
              )}
              {selectedCategories.includes(category.id) && (
                <X className="ml-1 h-3 w-3" />
              )}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}