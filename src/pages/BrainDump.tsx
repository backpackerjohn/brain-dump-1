import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TabNavigation } from "@/components/brain-dump/TabNavigation";
import { QuickAddModal } from "@/components/brain-dump/QuickAddModal";
import { AllThoughtsTab } from "@/components/brain-dump/AllThoughtsTab";
import { ClustersTab } from "@/components/brain-dump/ClustersTab";
import { ConnectionsTab } from "@/components/brain-dump/ConnectionsTab";
import { ArchiveTab } from "@/components/brain-dump/ArchiveTab";
import { useThoughts } from "@/hooks/useThoughts";
import { useCategories } from "@/hooks/useCategories";
import { useClusters } from "@/hooks/useClusters";
import { useThoughtFilters } from "@/hooks/useThoughtFilters";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { validateThoughtContent } from "@/utils/validation";
import { TOAST_MESSAGES } from "@/utils/toast-messages";

const BrainDump = () => {
  const { toast } = useToast();
  const [thoughtContent, setThoughtContent] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedThoughts, setSelectedThoughts] = useState<string[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingClusters, setIsGeneratingClusters] = useState(false);
  const [isFindingConnections, setIsFindingConnections] = useState(false);

  const {
    thoughts,
    archivedThoughts,
    isLoading,
    isLoadingArchive,
    processThought,
    archiveThought,
    restoreThought,
    removeCategoryFromThought,
    fetchArchivedThoughts,
    retryEmbeddings,
  } = useThoughts();

  const { categories } = useCategories();
  const { clusters, connections, generateClusters, findConnections } = useClusters();
  
  const {
    searchQuery,
    setSearchQuery,
    selectedCategories,
    toggleCategoryFilter,
    filteredThoughts,
  } = useThoughtFilters(thoughts);

  const handleProcessThought = async (content: string) => {
    const validation = validateThoughtContent(content);
    if (!validation.isValid) {
      toast(
        validation.error === 'Content required'
          ? TOAST_MESSAGES.validation.contentRequired
          : TOAST_MESSAGES.validation.contentTooShort
      );
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
    // Check if thoughts have embeddings
    const thoughtsWithEmbeddings = thoughts.filter(t => t.embedding && !t.embedding_failed);
    const thoughtsNeedingEmbeddings = thoughts.filter(t => !t.embedding || t.embedding_failed);
    
    if (thoughtsNeedingEmbeddings.length > 0) {
      toast({
        title: 'Some thoughts missing embeddings',
        description: `${thoughtsWithEmbeddings.length}/${thoughts.length} thoughts ready. Click "Retry Embeddings" first.`,
        variant: 'default'
      });
    }
    
    setIsGeneratingClusters(true);
    try {
      await generateClusters();
    } finally {
      setIsGeneratingClusters(false);
    }
  };

  const handleRetryEmbeddings = async () => {
    setIsProcessing(true);
    try {
      await retryEmbeddings();
    } finally {
      setIsProcessing(false);
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
              <AllThoughtsTab
                thoughts={filteredThoughts}
                categories={categories}
                isLoading={isLoading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategories={selectedCategories}
                onCategoryToggle={toggleCategoryFilter}
                isSelectMode={isSelectMode}
                onToggleSelectMode={toggleSelectMode}
                selectedThoughts={selectedThoughts}
                onToggleSelect={toggleThoughtSelection}
                onBulkArchive={handleBulkArchive}
                onArchive={archiveThought}
                onRemoveCategory={removeCategoryFromThought}
              />
            </TabsContent>

            <TabsContent value="clusters">
              <div className="space-y-4">
                {thoughts.some(t => !t.embedding || t.embedding_failed) && (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {thoughts.filter(t => !t.embedding || t.embedding_failed).length} thought(s) need embedding generation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Embeddings enable semantic clustering and connections
                      </p>
                    </div>
                    <Button 
                      onClick={handleRetryEmbeddings} 
                      disabled={isProcessing}
                      variant="outline"
                    >
                      {isProcessing ? "Retrying..." : "Retry Embeddings"}
                    </Button>
                  </div>
                )}
                <ClustersTab
                  clusters={clusters}
                  isGenerating={isGeneratingClusters}
                  onGenerate={handleGenerateClusters}
                  onArchive={archiveThought}
                />
              </div>
            </TabsContent>

            <TabsContent value="connections">
              <ConnectionsTab
                connections={connections}
                isFinding={isFindingConnections}
                onFind={handleFindConnections}
              />
            </TabsContent>

            <TabsContent value="archive">
              <ArchiveTab
                archivedThoughts={archivedThoughts}
                isLoading={isLoadingArchive}
                onRestore={restoreThought}
              />
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
