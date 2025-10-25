export interface Thought {
  id: string;
  user_id: string;
  content: string;
  title: string;
  snippet: string | null;
  status: 'active' | 'archived';
  is_completed: boolean;
  embedding: number[] | null;
  embedding_failed?: boolean;
  embedding_retry_count?: number;
  last_embedding_attempt?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  usage_count?: number;
}

export interface ThoughtCategory {
  categories: Category;
}

export interface ThoughtWithCategories extends Thought {
  thought_categories?: ThoughtCategory[];
}

export interface Cluster {
  id: string;
  name: string;
  is_manual?: boolean;
  is_collapsed?: boolean;
  created_at: string;
  updated_at?: string;
  thought_clusters?: Array<{
    thoughts: ThoughtWithCategories;
    is_completed?: boolean;
  }>;
}

export interface Connection {
  thought1_id: string;
  thought2_id: string;
  thought1: {
    title: string;
    categories: string[];
    is_completed: boolean;
  };
  thought2: {
    title: string;
    categories: string[];
    is_completed: boolean;
  };
  reason: string;
}
