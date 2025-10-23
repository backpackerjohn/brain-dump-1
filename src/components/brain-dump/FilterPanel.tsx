import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface FilterPanelProps {
  categories: Array<{ id: string; name: string }>;
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  selectedCount: number;
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
}: FilterPanelProps) {
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

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge
            key={category.id}
            variant={selectedCategories.includes(category.id) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onCategoryToggle(category.id)}
          >
            {category.name}
            {selectedCategories.includes(category.id) && (
              <X className="ml-1 h-3 w-3" />
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}