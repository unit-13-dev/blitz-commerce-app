'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import StarRating from './StarRating';

interface ReviewSummaryProps {
  productId: string;
}

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ productId }) => {
  const { data: reviewStats } = useQuery({
    queryKey: ['product-rating', productId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${productId}/rating`);
      return data;
    },
  });

  const { averageRating = 0, reviewCount = 0 } = reviewStats || { averageRating: 0, reviewCount: 0 };

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