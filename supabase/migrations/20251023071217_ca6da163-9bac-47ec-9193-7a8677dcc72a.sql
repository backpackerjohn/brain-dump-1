-- Add columns to track embedding generation status
ALTER TABLE thoughts 
ADD COLUMN IF NOT EXISTS embedding_failed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS embedding_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_embedding_attempt TIMESTAMP WITH TIME ZONE;

-- Create index for faster clustering queries on non-null embeddings
CREATE INDEX IF NOT EXISTS idx_thoughts_embedding_not_null 
ON thoughts USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL AND status = 'active';

-- Index for finding thoughts that need embedding retries
CREATE INDEX IF NOT EXISTS idx_thoughts_needs_embedding_retry
ON thoughts (embedding_failed, embedding_retry_count)
WHERE embedding_failed = true AND embedding_retry_count < 3;