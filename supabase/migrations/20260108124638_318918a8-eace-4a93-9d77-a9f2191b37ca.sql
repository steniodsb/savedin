-- Add unique constraint for upsert operations on shared_items
ALTER TABLE public.shared_items 
ADD CONSTRAINT shared_items_item_unique 
UNIQUE (item_id, item_type, shared_with_id);