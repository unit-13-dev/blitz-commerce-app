
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const SocialFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch posts from database with user avatar and images
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-feed-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          ),
          post_likes!left (
            user_id
          ),
          post_images (
            image_url,
            display_order
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching posts:', error);
        return [];
      }
      
      return (data || []).map(post => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        images: post.post_images?.sort((a, b) => a.display_order - b.display_order) || [],
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        shares: post.shares_count || 0,
        views: post.views_count || 0,
        timestamp: new Date(post.created_at).toLocaleDateString(),
        isLiked: user ? post.post_likes.some((like: any) => like.user_id === user.id) : false,
        user: {
          id: post.user_id,
          name: post.profiles?.full_name || post.profiles?.email?.split('@')[0] || 'Unknown User',
          avatar: post.profiles?.avatar_url || null, // Don't use fallback here
          username: `@${post.profiles?.email?.split('@')[0] || 'user'}`
        }
      }));
    },
  });

  // Like/unlike post mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Please login to like posts');

      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
    },
    onError: (error: any) => {
      console.error('Like mutation error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const trackView = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user?.id || null,
        });
      
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      }
    } catch (error) {
      console.log('View tracking failed:', error);
    }
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    if (!user) {
      toast({ title: "Please login to like posts" });
      return;
    }
    
    likeMutation.mutate({ postId, isLiked });
  };

  const handleShare = async (postId: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post',
          text: 'Check out this amazing post!',
          url: `${window.location.origin}/posts/${postId}`,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`).then(() => {
        toast({ title: "Link copied to clipboard!" });
      });
    } else {
      toast({ title: "Share feature coming soon!" });
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 dark:text-white">Community Feed</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">See what our community is sharing</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="smooth-card animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 dark:text-white">Community Feed</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">See what our community is sharing</p>
            </div>
            
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet</h3>
              <p className="text-gray-500">Be the first to share something with the community!</p>
              <Button className="mt-4 social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500">
                Join the Community
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 dark:text-white">Community Feed</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">See what our community is sharing</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="smooth-card p-6 floating-card animate-fade-in cursor-pointer dark:bg-gray-800 dark:border-gray-700"
                onClick={() => trackView(post.id)}
              >
                <div className="flex items-center mb-4">
                  {post.user.avatar ? (
                    <Avatar 
                      className="w-10 h-10 mr-3 cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(post.user.id);
                      }}
                    >
                      <AvatarImage src={post.user.avatar} alt={post.user.name} />
                      <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div 
                      className="w-10 h-10 mr-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(post.user.id);
                      }}
                    >
                      {post.user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 
                      className="font-medium text-sm cursor-pointer hover:text-pink-500 transition-colors dark:text-white dark:hover:text-pink-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(post.user.id);
                      }}
                    >
                      {post.user.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{post.user.username}</p>
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm line-clamp-3">{post.content}</p>
                
                {post.images && post.images.length > 0 && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <div className={`grid gap-1 ${
                      post.images.length === 1 ? 'grid-cols-1' :
                      post.images.length === 2 ? 'grid-cols-2' :
                      post.images.length === 3 ? 'grid-cols-3' :
                      'grid-cols-2'
                    }`}>
                      {post.images.slice(0, 4).map((image, index) => (
                        <div 
                          key={index} 
                          className={`relative ${
                            post.images.length === 3 && index === 2 ? 'col-span-2' :
                            post.images.length === 4 && index === 3 ? 'col-span-2' : ''
                          }`}
                        >
                          <div className={`${
                            post.images.length === 1 ? 'aspect-[4/3]' :
                            post.images.length === 2 ? 'aspect-square' :
                            post.images.length === 3 && index === 2 ? 'aspect-[2/1]' :
                            post.images.length === 4 && index === 3 ? 'aspect-[2/1]' :
                            'aspect-square'
                          }`}>
                            <img
                              src={image.image_url}
                              alt={`Post image ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post.id, post.isLiked);
                    }}
                    disabled={likeMutation.isPending}
                    className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
                      post.isLiked ? 'text-red-500' : ''
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likes}</span>
                  </button>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(post.id);
                    }}
                    className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                  >
                    <Share className="w-4 h-4" />
                    <span>{post.shares}</span>
                  </button>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.views}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              onClick={() => window.location.href = '/feed'}
              className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 dark:from-pink-600 dark:to-rose-500"
            >
              View All Posts
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialFeed;
