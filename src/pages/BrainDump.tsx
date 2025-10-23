import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ThoughtCard } from "@/components/brain-dump/ThoughtCard";
import { TabNavigation } from "@/components/brain-dump/TabNavigation";
import { FilterPanel } from "@/components/brain-dump/FilterPanel";
import { QuickAddModal } from "@/components/brain-dump/QuickAddModal";
import { useBrainDump } from "@/hooks/useBrainDump";
import { Plus, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const BrainDump = () => {
  const { toast } = useToast();
  const [thoughtContent, setThoughtContent] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedThoughts, setSelectedThoughts] = useState<string[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingClusters, setIsGeneratingClusters] = useState(false);
  const [isFindingConnections, setIsFindingConnections] = useState(false);

  const {
    thoughts,
    archivedThoughts,
    categories,
    clusters,
    connections,
    isLoading,
    isLoadingArchive,
    processThought,
    suggestCategories,
    generateClusters,
    findConnections,
    archiveThought,
    restoreThought,
    removeCategoryFromThought,
    fetchArchivedThoughts,
  } = useBrainDump();

  const handleProcessThought = async (content: string) => {
    // Validate input
    if (!content || content.trim().length === 0) {
      toast({
        title: "Content required",
        description: "Please enter some thoughts before processing",
        variant: "destructive",
      });
      return;
    }

    if (content.trim().length < 3) {
      toast({
        title: "Content too short",
        description: "Please enter at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await processThought(content.trim());
      setThoughtContent("");
    } catch (error) {
      console.error('Error processing thought:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAdd = async (content: string) => {
    await handleProcessThought(content);
    setIsQuickAddOpen(false);
  };


  const handleGenerateClusters = async () => {
    setIsGeneratingClusters(true);
    try {
      await generateClusters();
    } finally {
      setIsGeneratingClusters(false);
    }
  };

  const handleFindConnections = async () => {
    setIsFindingConnections(true);
    try {
      await findConnections();
      setActiveTab("connections");
    } finally {
      setIsFindingConnections(false);
    }
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedThoughts([]);
  };

  const toggleThoughtSelection = (thoughtId: string) => {
    setSelectedThoughts((prev) =>
      prev.includes(thoughtId)
        ? prev.filter((id) => id !== thoughtId)
        : [...prev, thoughtId]
    );
  };

  const handleBulkArchive = async () => {
    await Promise.all(selectedThoughts.map((id) => archiveThought(id)));
    setSelectedThoughts([]);
    setIsSelectMode(false);
  };

  const filteredThoughts = thoughts.filter((thought) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !thought.title.toLowerCase().includes(query) &&
        !thought.snippet?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    if (selectedCategories.length > 0) {
      const thoughtCategoryIds =
        thought.thought_categories?.map((tc: any) => tc.categories.id) || [];
      if (!selectedCategories.some((catId) => thoughtCategoryIds.includes(catId))) {
        return false;
      }
    }

    return true;
  });

  // Load archived thoughts when archive tab is activated
  useEffect(() => {
    if (activeTab === "archive" && archivedThoughts.length === 0) {
      fetchArchivedThoughts();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-brain bg-clip-text text-transparent">
              Brain Dump
            </h1>
            <p className="text-muted-foreground">
              Capture your thoughts. Let AI organize them intelligently.
            </p>
          </div>

          <Card className="p-6">
            <Textarea
              placeholder="What's on your mind? Dump all your thoughts here..."
              value={thoughtContent}
              onChange={(e) => setThoughtContent(e.target.value)}
              rows={4}
              className="mb-4"
            />
            <Button
              onClick={() => handleProcessThought(thoughtContent)}
              disabled={isProcessing || !thoughtContent.trim()}
              className="w-full"
              size="lg"
            >
              {isProcessing ? "Processing..." : "Process Thoughts"}
            </Button>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <TabsContent value="all">
              <FilterPanel
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryToggle={toggleCategoryFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isSelectMode={isSelectMode}
              onToggleSelectMode={toggleSelectMode}
              selectedCount={selectedThoughts.length}
            />

            {isSelectMode && selectedThoughts.length > 0 && (
              <div className="flex gap-2 mb-4">
                <Button onClick={handleBulkArchive} variant="destructive">
                  Archive Selected ({selectedThoughts.length})
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading your thoughts...</p>
              </div>
            ) : filteredThoughts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No thoughts yet. Start dumping your ideas above!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredThoughts.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    isSelectMode={isSelectMode}
                    isSelected={selectedThoughts.includes(thought.id)}
                    onToggleSelect={toggleThoughtSelection}
                    onArchive={archiveThought}
                    onRemoveCategory={removeCategoryFromThought}
                  />
                ))}
              </div>
            )}
            </TabsContent>

            <TabsContent value="clusters">
            <div className="space-y-4">
              <Button
                onClick={handleGenerateClusters}
                disabled={isGeneratingClusters}
                className="w-full"
              >
                {isGeneratingClusters ? "Generating..." : "AI-Generate Clusters"}
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
                        {cluster.thought_clusters?.map((tc: any) => (
                          <ThoughtCard
                            key={tc.thoughts.id}
                            thought={tc.thoughts}
                            onArchive={archiveThought}
                          />
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            </TabsContent>

            <TabsContent value="connections">
            <div className="space-y-4">
              <Button 
                onClick={handleFindConnections} 
                className="w-full"
                disabled={isFindingConnections}
              >
                {isFindingConnections ? "Finding Connections..." : "Find Surprising Connections"}
              </Button>

              {connections.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No connections found yet. Click above to discover hidden relationships.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((conn, idx) => (
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
            </TabsContent>

            <TabsContent value="archive">
            <div className="space-y-4">
              {isLoadingArchive ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading archived thoughts...</p>
                </div>
              ) : archivedThoughts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No archived thoughts. Archive thoughts to see them here.
                  </p>
                </div>
              ) : (
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
                        {thought.thought_categories?.map((tc: any) => (
                          <Badge key={tc.categories.id} variant="secondary">
                            {tc.categories.name}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => restoreThought(thought.id)}
                      >
                        Restore
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            </TabsContent>

            <TabsContent value="duplicates">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Duplicate detection coming soon.</p>
            </div>
            </TabsContent>
          </Tabs>
        </div>

        <Button
          onClick={() => setIsQuickAddOpen(true)}
          className="fixed bottom-8 right-8 h-14 w-14 md:w-auto md:px-6 rounded-full shadow-lg"
          size="lg"
        >
          <Plus className="h-6 w-6 md:mr-2" />
          <span className="hidden md:inline">Brain Dump</span>
        </Button>

        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onSubmit={handleQuickAdd}
          isProcessing={isProcessing}
        />
      </main>
    </div>
  );
};

export default BrainDump;
