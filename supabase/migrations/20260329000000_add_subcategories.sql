-- Add parent_id to categories for subcategory support
ALTER TABLE savedin.categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES savedin.categories(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON savedin.categories(parent_id);
