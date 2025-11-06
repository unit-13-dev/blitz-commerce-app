import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RatingData {
  averageRating: number;
  reviewCount: number;
}

export const useProductRating = (productId: string) => {
  return useQuery({
    queryKey: ['product-rating', productId],
    queryFn: async (): Promise<RatingData> => {
      if (!productId || productId.trim() === '') return { averageRating: 0, reviewCount: 0 };
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            rating,
            post_tag_mappings (
              post_tags (
                name
              )
            ),
            post_tagged_products (
              products (
                id
              )
            )
          `)
          .eq('status', 'published')
          .not('rating', 'is', null);

        if (error) throw error;

        // Filter for review posts with this specific product
        const reviewPosts = data?.filter(post => 
          post.post_tag_mappings?.some((mapping: any) => 
            mapping.post_tags?.name === 'review'
          ) &&
          post.post_tagged_products?.some((mapping: any) => 
            mapping.products?.id === productId
          )
        ) || [];

        const ratings = reviewPosts.map(post => post.rating).filter(Boolean) as number[];
        const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        const reviewCount = ratings.length;

        return {
          averageRating,
          reviewCount,
        };
      } catch (error) {
        console.error('Error fetching product rating:', error);
        return { averageRating: 0, reviewCount: 0 };
      }
    },
    enabled: !!productId && productId.trim() !== '',
  });
}; 