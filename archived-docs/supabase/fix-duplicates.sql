-- Fix duplicate categories in the database
-- This script removes duplicate category entries keeping only the first one

-- Delete duplicates, keeping the one with the lowest id for each (parent_id, name) combination
DELETE FROM categories c1
WHERE EXISTS (
  SELECT 1 FROM categories c2
  WHERE c1.parent_id IS NOT DISTINCT FROM c2.parent_id
    AND c1.name = c2.name
    AND c1.id > c2.id
);

-- Verify no duplicates remain
SELECT parent_id, name, COUNT(*) as count
FROM categories
GROUP BY parent_id, name
HAVING COUNT(*) > 1;
