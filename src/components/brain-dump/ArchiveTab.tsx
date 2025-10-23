import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import { ThoughtWithCategories } from '@/types/thought.types';

interface ArchiveTabProps {
  archivedThoughts: ThoughtWithCategories[];
  isLoading: boolean;
  onRestore: (id: string) => void;
}

export function ArchiveTab({ archivedThoughts, isLoading, onRestore }: ArchiveTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading archived thoughts...</p>
      </div>
    );
  }

  if (archivedThoughts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No archived thoughts. Archive thoughts to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {archivedThoughts.map((thought) => (
        <Card key={thought.id} className="p-4 opacity-75">
          <h3 className="font-semibold mb-2 line-clamp-2">{thought.title}</h3>
          {thought.snippet && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
              {thought.snippet}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {thought.thought_categories?.map((tc) => (
              <Badge key={tc.categories.id} variant="secondary">
                {tc.categories.name}
              </Badge>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onRestore(thought.id)}
          >
            Restore
          </Button>
        </Card>
      ))}
    </div>
  );
}
