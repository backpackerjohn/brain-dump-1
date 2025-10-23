-- Add is_manual column to clusters table
ALTER TABLE public.clusters 
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

-- Add updated_at column to clusters table
ALTER TABLE public.clusters 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add index for manual clusters
CREATE INDEX IF NOT EXISTS idx_clusters_is_manual 
ON public.clusters (is_manual);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clusters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clusters_updated_at_trigger
  BEFORE UPDATE ON public.clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_clusters_updated_at();

