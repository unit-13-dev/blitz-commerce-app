import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
        const { data } = await apiClient.get(`/products/${productId}/rating`);
        return {
          averageRating: data?.data?.averageRating ?? 0,
          reviewCount: data?.data?.reviewCount ?? 0,
        };
      } catch (error) {
        console.error('Error fetching product rating:', error);
        return { averageRating: 0, reviewCount: 0 };
      }
    },
    enabled: !!productId && productId.trim() !== '',
  });
}; 