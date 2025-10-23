import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Edit2, MoreVertical, Plus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThoughtCardProps {
  thought: {
    id: string;
    title: string;
    snippet: string | null;
    status: string;
    categories?: Array<{ categories: { id: string; name: string } }>;
  };
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
  onRemoveCategory?: (thoughtId: string, categoryId: string) => void;
  onAddCategory?: (thoughtId: string) => void;
  onAISuggest?: (thoughtId: string) => void;
}

export function ThoughtCard({
  thought,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onMarkDone,
  onArchive,
  onEdit,
  onRemoveCategory,
  onAddCategory,
  onAISuggest,
}: ThoughtCardProps) {
  const [showDone, setShowDone] = useState(false);

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow group relative"
      onMouseEnter={() => setShowDone(true)}
      onMouseLeave={() => setShowDone(false)}
    >
      {isSelectMode && (
        <div className="absolute top-4 left-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(thought.id)}
          />
        </div>
      )}

      {showDone && !isSelectMode && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 z-10"
          onClick={() => onMarkDone?.(thought.id)}
        >
          <Check className="h-4 w-4" />
        </Button>
      )}

      <div className={isSelectMode ? "ml-8" : ""}>
        <h3 className="font-semibold mb-2 line-clamp-2">{thought.title}</h3>
        {thought.snippet && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
            {thought.snippet}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {thought.categories?.map((tc) => (
            <Badge
              key={tc.categories.id}
              variant="secondary"
              className="group/badge cursor-pointer"
            >
              {tc.categories.name}
              <X
                className="ml-1 h-3 w-3 opacity-0 group-hover/badge:opacity-100 transition-opacity"
                onClick={() => onRemoveCategory?.(thought.id, tc.categories.id)}
              />
            </Badge>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => onAddCategory?.(thought.id)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAISuggest?.(thought.id)}
          >
            AI Suggest
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(thought.id)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive?.(thought.id)}>
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}