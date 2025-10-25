import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Edit2, MoreVertical, X, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThoughtCardProps {
  thought: {
    id: string;
    title: string;
    snippet: string | null;
    status: string;
    is_completed?: boolean;
    thought_categories?: Array<{ categories: { id: string; name: string } }>;
  };
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
  onRemoveCategory?: (thoughtId: string, categoryId: string) => void;
  onAddCategory?: (thoughtId: string) => void;
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
}: ThoughtCardProps) {
  const [showDone, setShowDone] = useState(false);
  const isCompleted = thought.is_completed || false;

  return (
    <Card
      className={cn(
        "p-4 hover:shadow-md transition-all duration-300 group relative",
        isCompleted && "opacity-50 bg-muted/30"
      )}
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
          variant={isCompleted ? "default" : "ghost"}
          className={cn(
            "absolute top-2 right-2 z-10 transition-colors",
            isCompleted && "bg-green-500 hover:bg-green-600"
          )}
          onClick={() => onMarkDone?.(thought.id)}
        >
          <Check className={cn(
            "h-4 w-4",
            isCompleted && "text-white"
          )} />
        </Button>
      )}

      <div className={isSelectMode ? "ml-8" : ""}>
        <h3 className={cn(
          "font-semibold mb-2 line-clamp-2",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {thought.title}
        </h3>
        {thought.snippet && (
          <p className={cn(
            "text-sm text-muted-foreground mb-3 line-clamp-3",
            isCompleted && "opacity-60"
          )}>
            {thought.snippet}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {thought.thought_categories?.map((tc) => (
            <Badge
              key={tc.categories.id}
              variant="secondary"
              className={cn(
                "group/badge cursor-pointer",
                isCompleted && "opacity-60"
              )}
            >
              {tc.categories.name}
              <X
                className="ml-1 h-3 w-3 opacity-0 group-hover/badge:opacity-100 transition-opacity"
                onClick={() => onRemoveCategory?.(thought.id, tc.categories.id)}
              />
            </Badge>
          ))}
          
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-muted"
            onClick={() => onAddCategory?.(thought.id)}
          >
            <Plus className="h-3 w-3" />
          </Badge>
        </div>

        {isCompleted && (
          <Badge variant="outline" className="mb-2 text-xs">
            <Check className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )}

        <div className="flex justify-end items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 bg-popover" sideOffset={5}>
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