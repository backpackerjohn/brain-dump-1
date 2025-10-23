import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThoughtCard } from './ThoughtCard';
import { Cluster } from '@/types/thought.types';

interface ClustersTabProps {
  clusters: Cluster[];
  isGenerating: boolean;
  onGenerate: () => void;
  onArchive: (id: string) => void;
}

export function ClustersTab({ clusters, isGenerating, onGenerate, onArchive }: ClustersTabProps) {
  return (
    <div className="space-y-4">
      <Button onClick={onGenerate} disabled={isGenerating} className="w-full">
        {isGenerating ? 'Generating...' : 'AI-Generate Clusters'}
      </Button>

      {clusters.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No clusters yet. Click the button above to generate semantic groupings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="p-6">
              <h3 className="text-xl font-semibold mb-4">{cluster.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cluster.thought_clusters?.map((tc) => (
                  <ThoughtCard
                    key={tc.thoughts.id}
                    thought={tc.thoughts}
                    onArchive={onArchive}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
