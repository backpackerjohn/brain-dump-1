import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <TabsList className="w-full justify-start">
      <TabsTrigger value="all">All Thoughts</TabsTrigger>
      <TabsTrigger value="clusters">Clusters</TabsTrigger>
      <TabsTrigger value="connections">Connections</TabsTrigger>
      <TabsTrigger value="archive">Archive</TabsTrigger>
      <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
    </TabsList>
  );
}