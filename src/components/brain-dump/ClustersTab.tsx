import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThoughtCard } from './ThoughtCard';
import { Cluster } from '@/types/thought.types';
import { 
  ChevronDown, 
  ChevronRight, 
  Pencil, 
  Check, 
  X, 
  Plus,
  Sparkles,
  Search
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ClustersTabProps {
  clusters: Cluster[];
  unclusteredCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
  onArchive: (id: string) => void;
  onCreateManualCluster: (name: string) => void;
  onRenameCluster: (clusterId: string, newName: string) => void;
  onFindRelated: (clusterId: string) => void;
  isFindingRelated?: string | null;
}

export function ClustersTab({ 
  clusters, 
  unclusteredCount,
  isGenerating, 
  onGenerate, 
  onArchive,
  onCreateManualCluster,
  onRenameCluster,
  onFindRelated,
  isFindingRelated
}: ClustersTabProps) {
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set());
  const [editingCluster, setEditingCluster] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creatingCluster, setCreatingCluster] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');

  const toggleCluster = (clusterId: string) => {
    setOpenClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const startEdit = (cluster: Cluster) => {
    setEditingCluster(cluster.id);
    setEditName(cluster.name);
  };

  const cancelEdit = () => {
    setEditingCluster(null);
    setEditName('');
  };

  const saveEdit = (clusterId: string) => {
    if (editName.trim()) {
      onRenameCluster(clusterId, editName.trim());
    }
    setEditingCluster(null);
    setEditName('');
  };

  const handleCreateCluster = () => {
    if (newClusterName.trim()) {
      onCreateManualCluster(newClusterName.trim());
      setNewClusterName('');
      setCreatingCluster(false);
    }
  };

  const getThoughtCount = (cluster: Cluster) => {
    return cluster.thought_clusters?.length || 0;
  };

  // Show empty state if user has < 10 unclustered thoughts and no clusters
  if (unclusteredCount < 10 && clusters.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Clusters of related thoughts will appear here
              </h3>
              <p className="text-muted-foreground">
                Add at least 10 thoughts to enable AI-powered organization.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Currently: <span className="font-medium">{unclusteredCount}</span> thought{unclusteredCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {unclusteredCount >= 10 && (
          <Button 
            onClick={onGenerate} 
            disabled={isGenerating} 
            className="flex-1 min-w-[300px]"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                Analyzing your thoughts...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                ✨ You have {unclusteredCount} unclustered thoughts. Let AI find the patterns.
              </>
            )}
          </Button>
        )}
        
        {!creatingCluster ? (
          <Button 
            onClick={() => setCreatingCluster(true)}
            variant="outline"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Cluster
          </Button>
        ) : (
          <div className="flex gap-2 flex-1 min-w-[300px]">
            <Input
              value={newClusterName}
              onChange={(e) => setNewClusterName(e.target.value)}
              placeholder="Enter cluster name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCluster();
                if (e.key === 'Escape') {
                  setCreatingCluster(false);
                  setNewClusterName('');
                }
              }}
              autoFocus
            />
            <Button onClick={handleCreateCluster} size="icon">
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => {
                setCreatingCluster(false);
                setNewClusterName('');
              }} 
              variant="ghost" 
              size="icon"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isGenerating && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="text-center space-y-2">
            <Sparkles className="h-8 w-8 animate-pulse mx-auto text-primary" />
            <p className="text-sm font-medium">
              AI is finding hidden connections...
            </p>
            <p className="text-xs text-muted-foreground">
              This may take a moment for large collections
            </p>
          </div>
        </Card>
      )}

      {/* Clusters List */}
      {clusters.length === 0 && !isGenerating ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              {unclusteredCount >= 10 
                ? "No clusters yet. Click the button above to generate semantic groupings." 
                : `No clusters yet. Add ${10 - unclusteredCount} more thought${10 - unclusteredCount !== 1 ? 's' : ''} to enable AI clustering.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => {
            const isOpen = openClusters.has(cluster.id);
            const thoughtCount = getThoughtCount(cluster);
            const isEditing = editingCluster === cluster.id;
            const isFinding = isFindingRelated === cluster.id;

            return (
              <Collapsible
                key={cluster.id}
                open={isOpen}
                onOpenChange={() => toggleCluster(cluster.id)}
              >
                <Card className="overflow-hidden">
                  <div className="p-4 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3 flex-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(cluster.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button 
                            onClick={() => saveEdit(cluster.id)} 
                            size="icon" 
                            className="h-8 w-8"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={cancelEdit} 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold flex-1">
                            {cluster.name}
                          </h3>
                          <Button
                            onClick={() => startEdit(cluster)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-muted-foreground">
                        {thoughtCount} thought{thoughtCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="p-6 space-y-4">
                      {/* Find Related Button (show if cluster has 2+ thoughts) */}
                      {thoughtCount >= 2 && unclusteredCount > 0 && (
                        <Button
                          onClick={() => onFindRelated(cluster.id)}
                          disabled={isFinding}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          {isFinding 
                            ? 'Finding related thoughts...' 
                            : `Find related thoughts (${unclusteredCount} available)`
                          }
                        </Button>
                      )}

                      {/* Thoughts Grid */}
                      {thoughtCount === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>This cluster is empty. Add thoughts to it to use AI-powered suggestions.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cluster.thought_clusters?.map((tc) => (
                            <ThoughtCard
                              key={tc.thoughts.id}
                              thought={tc.thoughts}
                              onArchive={onArchive}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
