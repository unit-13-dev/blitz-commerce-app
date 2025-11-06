import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Filter, SortAsc, SortDesc } from 'lucide-react';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';

interface ReviewListProps {
  productId: string;
  productVendorId: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';
type FilterOption = 'all' | '5' | '4' | '3' | '2' | '1';

const ReviewList: React.FC<ReviewListProps> = ({ productId, productVendorId }) => {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const { user } = useAuth();
  
  const isVendor = user?.id === productVendorId;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['product-reviews', productId, sortBy, filterBy],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          ),
          post_tag_mappings (
            post_tags (
              name
            )
          ),
          post_tagged_products (
            products (
              id,
              name
            )
          ),
          post_images (
            image_url,
            display_order
          )
        `)
        .eq('status', 'published')
        .not('rating', 'is', null)
        .range(pageParam, pageParam + 9);

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'highest':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest':
          query = query.order('rating', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter for review posts with this specific product (client-side filtering)
      const reviewPosts = data?.filter(post => 
        post.post_tag_mappings?.some((mapping: any) => 
          mapping.post_tags?.name === 'review'
        ) &&
        post.post_tagged_products?.some((mapping: any) => 
          mapping.products?.id === productId
        )
      ) || [];

      // Apply rating filter (client-side)
      const filteredPosts = filterBy !== 'all' 
        ? reviewPosts.filter(post => post.rating === parseInt(filterBy))
        : reviewPosts;

      return filteredPosts;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 10) return undefined;
      return allPages.length * 10;
    },
    initialPageParam: 0,
  });

  const reviews = data?.pages.flat() || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading reviews...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">Error loading reviews</div>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No reviews yet. Be the first to review this product!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
          <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <SortAsc className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            productId={productId}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="mt-6 text-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More Reviews'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewList; 