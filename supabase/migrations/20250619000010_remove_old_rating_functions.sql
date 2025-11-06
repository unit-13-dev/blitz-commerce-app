-- Remove old rating functions that are no longer needed
-- These functions were part of the old product_reviews system
-- which has been replaced with the new posts-based review system
 
DROP FUNCTION IF EXISTS public.get_product_average_rating(UUID);
DROP FUNCTION IF EXISTS public.get_product_review_count(UUID); 