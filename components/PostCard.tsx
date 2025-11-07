'use client';

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share, Globe, Users, FileText, Tag, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import StarRating from "@/components/StarRating";
import { debounce } from "lodash";
import { apiClient } from "@/lib/api-client";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    feeling?: string;
    privacy?: 'public' | 'following' | 'draft';
    status?: 'published' | 'draft';
    tags?: Array<{
      tag: {
        name: string;
      };
    }>;
    createdAt: string;
    user: {
      id: string;
      fullName: string | null;
      email: string;
      avatarUrl: string | null;
    };
    images?: Array<{
      imageUrl: string;
      displayOrder: number;
    }>;
    likes?: Array<{
      userId: string;
      user?: {
        id: string;
        fullName: string | null;
      };
    }>;
    _count?: {
      likes: number;
      comments: number;
    };
    rating?: number | null;
    taggedItems?: Array<{
      product: {
        id: string;
        name: string;
        price: number;
        imageUrl: string | null;
        images?: Array<{
          imageUrl: string;
        }>;
      };
    }>;
  };
  onUserClick?: (userId: string) => void;
  onCommentClick?: (postId: string) => void;
  showUserInfo?: boolean;
  currentUserId?: string;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onUserClick, 
  onCommentClick,
  showUserInfo = true,
  currentUserId 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // Derive user info
  const userName = post?.user?.fullName || post?.user?.email?.split("@")[0] || "User";
  const userAvatar = post?.user?.avatarUrl;
  const username = `@${post?.user?.email?.split("@")[0] || post?.user?.id?.slice(0, 8)}`;
  
  // Determine if post is liked by current user
  const userId = currentUserId || user?.id;
  const isLikedByCurrentUser = userId ? post?.likes?.some(like => like.userId === userId) : false;
  const likesCount = post?._count?.likes || 0;
  const commentsCount = post?._count?.comments || 0;
  
  const [isLiked, setIsLiked] = useState(isLikedByCurrentUser);
  const [currentLikesCount, setCurrentLikesCount] = useState(likesCount);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const debouncedLikeRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedLikeAction = useCallback(
    debounce(async (shouldLike: boolean) => {
      if (!user) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to like posts.",
          variant: "destructive",
        });
        return;
      }

      try {
        await apiClient.post(`/posts/${post.id}/like`, { like: shouldLike });
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
      } catch (error: any) {
        setIsLiked(!shouldLike);
        setCurrentLikesCount(prev => shouldLike ? prev - 1 : prev + 1);
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to update like",
          variant: "destructive",
        });
      }
    }, 1000),
    [user, post.id, queryClient, toast]
  );

  // Handle like button click with optimistic updates
  const handleLike = () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to like posts.",
        variant: "destructive",
      });
      return;
    }

    // Clear any existing timeout
    if (debouncedLikeRef.current) {
      clearTimeout(debouncedLikeRef.current);
    }

    // Optimistic update - immediate UI feedback
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    setCurrentLikesCount(prev => newLikeState ? prev + 1 : prev - 1);

    // Set loading state
    setIsLikeLoading(true);

    // Debounce the actual API call
    debouncedLikeAction(newLikeState);

    // Clear loading state after 1 second
    debouncedLikeRef.current = setTimeout(() => {
      setIsLikeLoading(false);
    }, 1000);
  };

  // Share post
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s post`,
          text: post.content,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(post.content);
      toast({
        title: "Copied to clipboard",
        description: "Post content has been copied to your clipboard.",
      });
    }
  };

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(post.user.id);
    } else {
      router.push(`/users/${post.user.id}`);
    }
  };

  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick(post.id);
    }
  };

  const renderContentWithTags = (content: string) => {
    const words = content.split(" ");
    return words.map((word, index) => {
      if (word.startsWith("#")) {
        return (
          <span
            key={index}
            className="text-pink-500 hover:text-pink-600 cursor-pointer font-medium"
          >
            {word}{" "}
          </span>
        );
      }
      if (word.startsWith("@")) {
        return (
          <span
            key={index}
            className="text-blue-500 hover:text-blue-600 cursor-pointer font-medium hover:underline"
                onClick={async () => {
              const username = word.slice(1);
              try {
                const { data } = await apiClient.get('/search', {
                  params: { q: username, type: 'users' }
                });
                const users = data?.users || [];
                if (users.length > 0) {
                  router.push(`/users/${users[0].id}`);
                } else {
                  toast({
                    title: "User not found",
                    description: `Could not find user ${username}`,
                    variant: "destructive",
                  });
                }
              } catch (error) {
                console.error("Error looking up user:", error);
                toast({
                  title: "Error",
                  description: "Failed to navigate to user profile",
                  variant: "destructive",
                });
              }
            }}
          >
            {word}{" "}
          </span>
        );
      }
      return <span key={index}>{word} </span>;
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  return (
    <article className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Header Section */}
      {showUserInfo && (
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center space-x-3">
            <Avatar 
              className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-pink-200 transition-all"
              onClick={handleUserClick}
            >
              <AvatarImage src={userAvatar || undefined} alt={userName} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white font-medium">
                {userName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h3 
                  className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-pink-500 transition-colors"
                  onClick={handleUserClick}
                >
                  {userName}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {username}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatTimeAgo(post.createdAt)}</span>
                {post.privacy && (
                  <>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      {post.privacy === 'public' && <Globe className="w-3 h-3" />}
                      {post.privacy === 'following' && <Users className="w-3 h-3" />}
                      {post.privacy === 'draft' && <FileText className="w-3 h-3" />}
                      <span className="capitalize">{post.privacy}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="px-4 pb-3">
        <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
          {renderContentWithTags(post.content)}
        </div>
      </div>

      {/* Post Tags Section */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tagMapping, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tagMapping.tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Star Rating for Review Posts */}
      {post.rating && post.tags?.some(tagMapping => tagMapping.tag.name === 'review') && (
        <div className="px-4 pb-3">
          <div className="flex items-center space-x-3">
            <span className="text-base font-medium text-gray-700 dark:text-gray-300">Rating:</span>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${
                    post.rating && post.rating >= star ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
              ({post.rating}/5)
            </span>
          </div>
        </div>
      )}

      {/* Media Section */}
      {post.images && post.images.length > 0 && (() => {
        const images = post.images;
        const imagesLength = images.length;
        return (
        <div className="px-4 pb-4">
          <div className={`grid gap-2 ${
            imagesLength === 1 ? 'grid-cols-1' :
            imagesLength === 2 ? 'grid-cols-2' :
            imagesLength === 3 ? 'grid-cols-3' :
            'grid-cols-2'
          }`}>
            {images.map((image, index) => {
              const isVideo = image.imageUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);
              
              return (
                <div 
                  key={index} 
                  className={`relative rounded-xl overflow-hidden ${
                    imagesLength === 3 && index === 2 ? 'col-span-2' :
                    imagesLength === 4 && index === 3 ? 'col-span-2' : ''
                  }`}
                >
                  <div className={`${
                    imagesLength === 1 ? 'aspect-[4/3]' :
                    imagesLength === 2 ? 'aspect-square' :
                    imagesLength === 3 && index === 2 ? 'aspect-[2/1]' :
                    imagesLength === 4 && index === 3 ? 'aspect-[2/1]' :
                    'aspect-square'
                  }`}>
                    {isVideo ? (
                      <video
                        src={image.imageUrl}
                        controls
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={image.imageUrl}
                        alt={`Post media ${index + 1}`}
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

      {/* Tagged Products Section */}
      {post.taggedItems && post.taggedItems.length > 0 && (
        <div className="px-4 pb-4">
          <div className="space-y-3">
            {post.taggedItems.map((item, index) => {
              const product = item.product;
              const productImage = product.images?.[0]?.imageUrl || product.imageUrl || "/placeholder.svg";
              const productPrice = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price);
              
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={productImage}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-2">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        ₹{productPrice.toLocaleString()}
                      </span>
                      <ShoppingBag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLikeLoading}
              className={`flex items-center space-x-2 h-8 px-3 rounded-full transition-all ${
                isLiked
                  ? "text-pink-500 bg-pink-50 hover:bg-pink-100 dark:bg-pink-900/20 dark:hover:bg-pink-900/30"
                  : "text-gray-600 hover:text-pink-500 hover:bg-pink-50 dark:text-gray-400 dark:hover:text-pink-400 dark:hover:bg-pink-900/20"
              } ${isLikeLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Heart
                className={`w-4 h-4 ${
                  isLiked ? "fill-current" : ""
                } ${isLikeLoading ? "animate-pulse" : ""}`}
              />
              <span className="text-sm font-medium">{currentLikesCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCommentClick}
              className="flex items-center space-x-2 h-8 px-3 rounded-full text-gray-600 hover:text-pink-500 hover:bg-pink-50 dark:text-gray-400 dark:hover:text-pink-400 dark:hover:bg-pink-900/20 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{commentsCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-2 h-8 px-3 rounded-full text-gray-600 hover:text-pink-500 hover:bg-pink-50 dark:text-gray-400 dark:hover:text-pink-400 dark:hover:bg-pink-900/20 transition-all"
            >
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard; 