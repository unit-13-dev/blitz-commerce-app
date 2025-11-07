import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewPost {
  id: string;
  content: string;
  rating: number;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
  post_tag_mappings: Array<{
    post_tags: {
      name: string;
    };
  }>;
  post_images?: Array<{
    image_url: string;
    display_order: number;
  }>;
}

interface ReviewCardProps {
  review: ReviewPost;
  productId: string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, productId }) => {
  const userName = review.profiles?.full_name || 'Unknown User';
  const userAvatar = review.profiles?.avatar_url;

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="bg-pink-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {userName}
                </h4>
                <Badge variant="secondary" className="bg-pink-50 text-pink-700 border-pink-200">
                  <Tag className="w-3 h-3 mr-1" />
                  Review
                </Badge>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {/* Star Rating - Bigger Display */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-2xl ${
                      review.rating && review.rating >= star ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                ({review.rating}/5)
              </span>
            </div>
            
            {/* Review Content */}
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              {review.content}
            </p>

            {/* Media Display */}
            {review.post_images && review.post_images.length > 0 && (() => {
              const images = review.post_images;
              return (
                <div className="mt-3">
                  <div className={`grid gap-2 ${
                    images.length === 1 ? 'grid-cols-1' :
                    images.length === 2 ? 'grid-cols-2' :
                    images.length === 3 ? 'grid-cols-3' :
                    'grid-cols-2'
                  }`}>
                    {images.map((image, index) => {
                      const isVideo = image.image_url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);
                      
                      return (
                        <div 
                          key={index} 
                          className={`relative rounded-xl overflow-hidden ${
                            images.length === 3 && index === 2 ? 'col-span-2' :
                            images.length === 4 && index === 3 ? 'col-span-2' : ''
                          }`}
                        >
                          <div className={`${
                            images.length === 1 ? 'aspect-[4/3]' :
                            images.length === 2 ? 'aspect-square' :
                            images.length === 3 && index === 2 ? 'aspect-[2/1]' :
                            images.length === 4 && index === 3 ? 'aspect-[2/1]' :
                            'aspect-square'
                          }`}>
                          {isVideo ? (
                            <video
                              src={image.image_url}
                              controls
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={image.image_url}
                              alt={`Review media ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCard; 