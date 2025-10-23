-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Thoughts table
CREATE TABLE public.thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thoughts"
  ON public.thoughts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thoughts"
  ON public.thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own thoughts"
  ON public.thoughts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own thoughts"
  ON public.thoughts FOR DELETE
  USING (auth.uid() = user_id);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Clusters table
CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clusters"
  ON public.clusters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clusters"
  ON public.clusters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clusters"
  ON public.clusters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clusters"
  ON public.clusters FOR DELETE
  USING (auth.uid() = user_id);

-- Thought categories junction table
CREATE TABLE public.thought_categories (
  thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thought_id, category_id)
);

ALTER TABLE public.thought_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thought categories"
  ON public.thought_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own thought categories"
  ON public.thought_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own thought categories"
  ON public.thought_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

-- Thought clusters junction table
CREATE TABLE public.thought_clusters (
  thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thought_id, cluster_id)
);

ALTER TABLE public.thought_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thought clusters"
  ON public.thought_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own thought clusters"
  ON public.thought_clusters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own thought clusters"
  ON public.thought_clusters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own thought clusters"
  ON public.thought_clusters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_thoughts_user_id ON public.thoughts(user_id);
CREATE INDEX idx_thoughts_status ON public.thoughts(status);
CREATE INDEX idx_thoughts_created_at ON public.thoughts(created_at DESC);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_clusters_user_id ON public.clusters(user_id);
CREATE INDEX idx_thought_categories_thought_id ON public.thought_categories(thought_id);
CREATE INDEX idx_thought_categories_category_id ON public.thought_categories(category_id);
CREATE INDEX idx_thought_clusters_thought_id ON public.thought_clusters(thought_id);
CREATE INDEX idx_thought_clusters_cluster_id ON public.thought_clusters(cluster_id);

-- Vector similarity search index
CREATE INDEX ON public.thoughts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);