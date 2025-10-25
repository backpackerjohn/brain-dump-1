import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Connection } from '@/types/thought.types';
import { Sparkles, Loader2 } from 'lucide-react';

interface ConnectionsTabProps {
  connections: Connection[];
  isFinding: boolean;
  onFind: () => void;
}

export function ConnectionsTab({ connections, isFinding, onFind }: ConnectionsTabProps) {
  // Filter out connections where either thought is completed
  const activeConnections = connections.filter(
    conn => !conn.thought1.is_completed && !conn.thought2.is_completed
  );

  return (
    <div className="space-y-4">
      <Button onClick={onFind} className="w-full" disabled={isFinding} size="lg">
        {isFinding ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finding Connections...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Find Surprising Connections
          </>
        )}
      </Button>

      {activeConnections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {connections.length > 0 
              ? 'All connections involve completed thoughts. Mark thoughts as active to see connections.'
              : 'No connections found yet. Click above to discover hidden relationships.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeConnections.map((conn, idx) => (
            <Card key={idx} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">{conn.thought1.title}</h4>
                  <div className="flex flex-wrap gap-1">
                    {conn.thought1.categories.map((cat: string) => (
                      <span key={cat} className="text-xs bg-primary/10 px-2 py-1 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{conn.thought2.title}</h4>
                  <div className="flex flex-wrap gap-1">
                    {conn.thought2.categories.map((cat: string) => (
                      <span key={cat} className="text-xs bg-primary/10 px-2 py-1 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">{conn.reason}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
