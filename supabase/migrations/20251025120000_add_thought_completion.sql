-- Add is_completed column to thoughts table
ALTER TABLE public.thoughts 
  ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering completed thoughts
CREATE INDEX idx_thoughts_is_completed ON public.thoughts(is_completed);

-- Function to add category to thought (creates category if doesn't exist)
CREATE OR REPLACE FUNCTION add_category_to_thought(
  p_thought_id UUID,
  p_category_name TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Get or create category
  INSERT INTO categories (user_id, name)
  VALUES (p_user_id, p_category_name)
  ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_category_id;
  
  -- Link to thought (ignore if already exists)
  INSERT INTO thought_categories (thought_id, category_id)
  VALUES (p_thought_id, v_category_id)
  ON CONFLICT (thought_id, category_id) DO NOTHING;
  
  RETURN v_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

