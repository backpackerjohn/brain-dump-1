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
import { EditThoughtModal } from "@/components/brain-dump/EditThoughtModal";
import { useThoughts } from "@/hooks/useThoughts";
import { useCategories } from "@/hooks/useCategories";
import { useClusters } from "@/hooks/useClusters";
import { useThoughtFilters } from "@/hooks/useThoughtFilters";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { validateThoughtContent } from "@/utils/validation";
import { TOAST_MESSAGES } from "@/utils/toast-messages";
import { ThoughtWithCategories } from "@/types/thought.types";

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
  const [isFindingRelated, setIsFindingRelated] = useState<string | null>(null);
  const [editingThought, setEditingThought] = useState<ThoughtWithCategories | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const {
    thoughts,
    archivedThoughts,
    isLoading,
    isLoadingArchive,
    processThought,
    archiveThought,
    restoreThought,
    removeCategoryFromThought,
    toggleThoughtCompletion,
    updateThought,
    addCategoryToThought,
    fetchArchivedThoughts,
  } = useThoughts();

  const { categories } = useCategories();
  const { 
    clusters, 
    connections, 
    unclusteredCount,
    generateClusters, 
    findConnections,
    createManualCluster,
    renameCluster,
    findRelatedThoughts,
    checkClusterCompletion,
    archiveCluster
  } = useClusters(thoughts);
  
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

  const handleCreateManualCluster = async (name: string) => {
    try {
      await createManualCluster(name);
    } catch (error) {
      console.error('Error creating cluster:', error);
    }
  };

  const handleRenameCluster = async (clusterId: string, newName: string) => {
    try {
      await renameCluster(clusterId, newName);
    } catch (error) {
      console.error('Error renaming cluster:', error);
    }
  };

  const handleFindRelated = async (clusterId: string) => {
    setIsFindingRelated(clusterId);
    try {
      await findRelatedThoughts(clusterId);
    } finally {
      setIsFindingRelated(null);
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

  const handleMarkDone = async (thoughtId: string) => {
    try {
      await toggleThoughtCompletion(thoughtId);
    } catch (error) {
      console.error('Error toggling completion:', error);
    }
  };

  const handleEdit = (thoughtId: string) => {
    const thought = thoughts.find(t => t.id === thoughtId);
    if (thought) {
      setEditingThought(thought);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEdit = async (
    thoughtId: string,
    updates: { title: string; snippet: string | null }
  ) => {
    setIsSavingEdit(true);
    try {
      await updateThought(thoughtId, updates);
      setIsEditModalOpen(false);
      setEditingThought(null);
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddCategory = async (thoughtId: string) => {
    // This will be handled by CategorySelector component
    // For now, we'll just pass the addCategoryToThought function
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
                onMarkDone={handleMarkDone}
                onEdit={handleEdit}
                onAddCategory={handleAddCategory}
              />
            </TabsContent>

            <TabsContent value="clusters">
              <ClustersTab
                clusters={clusters}
                unclusteredCount={unclusteredCount}
                isGenerating={isGeneratingClusters}
                onGenerate={handleGenerateClusters}
                onArchive={archiveThought}
                onCreateManualCluster={handleCreateManualCluster}
                onRenameCluster={handleRenameCluster}
                onFindRelated={handleFindRelated}
                isFindingRelated={isFindingRelated}
                checkClusterCompletion={checkClusterCompletion}
                onArchiveCluster={archiveCluster}
                onMarkDone={handleMarkDone}
              />
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

        <EditThoughtModal
          thought={editingThought}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingThought(null);
          }}
          onSave={handleSaveEdit}
          isSaving={isSavingEdit}
        />
      </main>
    </div>
  );
};

export default BrainDump;
