import { ThoughtCard } from './ThoughtCard';
import { Brain } from 'lucide-react';
import { ThoughtWithCategories } from '@/types/thought.types';

interface ThoughtListProps {
  thoughts: ThoughtWithCategories[];
  isLoading: boolean;
  isSelectMode?: boolean;
  selectedThoughts?: string[];
  onToggleSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRemoveCategory?: (thoughtId: string, categoryId: string) => void;
  emptyMessage?: string;
}

export function ThoughtList({
  thoughts,
  isLoading,
  isSelectMode,
  selectedThoughts = [],
  onToggleSelect,
  onArchive,
  onRemoveCategory,
  emptyMessage = 'No thoughts yet. Start dumping your ideas above!'
}: ThoughtListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading your thoughts...</p>
      </div>
    );
  }

  if (thoughts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {thoughts.map((thought) => (
        <ThoughtCard
          key={thought.id}
          thought={thought}
          isSelectMode={isSelectMode}
          isSelected={selectedThoughts.includes(thought.id)}
          onToggleSelect={onToggleSelect}
          onArchive={onArchive}
          onRemoveCategory={onRemoveCategory}
        />
      ))}
    </div>
  );
}
