import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import StarRating from './StarRating';

interface ReviewSummaryProps {
  productId: string;
}

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ productId }) => {
  const { data: reviewStats } = useQuery({
    queryKey: ['product-review-stats', productId],
    queryFn: async () => {
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
    },
  });

  const { averageRating = 0, reviewCount = 0 } = reviewStats || {};

  if (reviewCount === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No reviews yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-2xl ${
                      Math.round(averageRating) >= star ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {averageRating.toFixed(1)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </Badge>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Based on {reviewCount} customer {reviewCount === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewSummary; 