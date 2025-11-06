import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share, Plus, Image, ArrowUp, Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CommentsDialog from "@/components/CommentsDialog";
import InstagramStylePostCreator from "@/components/InstagramStylePostCreator";
import PostCard from "@/components/PostCard";
import { useNavigate } from "react-router-dom";
import { debounce } from "lodash";
import { getProductImages } from "@/lib/utils";

// Define feelings (same as in post creator)
const feelings = [
  { emoji: "😊", name: "Happy" },
  { emoji: "😢", name: "Sad" },
  { emoji: "😍", name: "In Love" },
  { emoji: "😴", name: "Sleepy" },
  { emoji: "😃", name: "Excited" },
  { emoji: "😣", name: "Frustrated" },
  { emoji: "🥳", name: "Celebrating" },
  { emoji: "😎", name: "Cool" },
  { emoji: "🤩", name: "Amazed" },
  { emoji: "😌", name: "Relaxed" },
];

const Feed = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedPostForComments, setSelectedPostForComments] = useState<
    string | null
  >(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Categories for filtering
  const categories = [
    { value: "all", label: "All Posts" },
    { value: "review", label: "Reviews" },
    { value: "tutorial", label: "Tutorials" },
    { value: "unboxing", label: "Unboxing" },
    { value: "question", label: "Questions" },
    { value: "announcement", label: "Announcements" },
  ];

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  // Clear category filter
  const clearCategory = () => {
    setSelectedCategory("all");
  };

  // Combined clear for both search and category
  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedCategory("all");
  };

  // Handle scroll event to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Function to scroll to top with smooth animation
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Fetch posts from database with proper privacy filtering
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", debouncedSearchQuery, selectedCategory],
    queryFn: async () => {
      // The RLS policy should automatically filter posts based on privacy
      // But we'll also add client-side filtering for better UX
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          ),
          post_likes (user_id),
          comment_count: post_comments (count),
          post_images (
            image_url,
            display_order
          ),
          post_tag_mappings (
            post_tags (
              name
            )
          ),
          post_tagged_products (
            products (
              id,
              name,
              price
            )
          )
        `
        )
        .eq('status', 'published')
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get all product IDs from tagged products
      const productIds = data?.flatMap(post => 
        post.post_tagged_products?.map(mapping => mapping.products?.id).filter(Boolean) || []
      ) || [];
      
      // Fetch product images for all tagged products
      const productImages = await getProductImages(productIds);

      // Transform the data
      const transformedPosts = data.map((post) => ({
        ...post,
        user: {
          id: post.user_id,
          name:
            post.profiles?.full_name ||
            post.profiles?.email?.split("@")[0] ||
            "Unknown User",
          avatar: post.profiles?.avatar_url || null,
          username: `@${post.profiles?.email?.split("@")[0] || "user"}`,
        },
        liked:
          user && post.post_likes?.some((like) => like.user_id === user?.id) || false,
        likes_count: post.post_likes?.length || 0,
        comments_count: post.comment_count?.[0]?.count || 0,
        images: post.post_images?.sort((a, b) => a.display_order - b.display_order) || [],
        post_tags: post.post_tag_mappings?.map((mapping: any) => mapping.post_tags) || [],
        tagged_products: post.post_tagged_products?.map((mapping) => ({
          product_id: mapping.products.id,
          product_name: mapping.products.name,
          product_price: mapping.products.price,
          product_image: productImages[mapping.products.id] || null, // Use image from product_images
        })) || [],
        rating: post.rating,
      }));

      // Additional client-side filtering for better UX
      // This ensures that even if RLS doesn't work perfectly, we have a fallback
      const filteredPosts = await Promise.all(
        transformedPosts.map(async (post) => {
          // If user is not logged in, only show public posts
          if (!user) {
            return post.privacy === 'public' ? post : null;
          }

          // If user is the post creator, show all their posts
          if (post.user_id === user.id) {
            return post;
          }

          // For other users, apply privacy rules
          switch (post.privacy) {
            case 'public':
              return post;
            case 'following':
              // For 'following' posts, check if the current user follows the post creator
              try {
                const { data: followData } = await supabase
                  .from('user_follows')
                  .select('id')
                  .eq('follower_id', user.id)
                  .eq('following_id', post.user_id)
                  .single();
                
                return followData ? post : null;
              } catch (error) {
                return null;
              }
            case 'draft':
              // Draft posts should not appear in the feed
              return null;
            default:
              return post;
          }
        })
      );

      let result = filteredPosts.filter(Boolean);

      // Apply search filter
      if (debouncedSearchQuery.trim()) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        result = result.filter(post => {
          // Search in post content
          if (post.content?.toLowerCase().includes(searchLower)) return true;
          
          // Search in post tags
          if (post.post_tags?.some((tag: any) => 
            tag.name?.toLowerCase().includes(searchLower)
          )) return true;
          
          // Search in usernames
          if (post.user?.name?.toLowerCase().includes(searchLower) ||
              post.user?.username?.toLowerCase().includes(searchLower)) return true;
          
          // Search in tagged product names
          if (post.tagged_products?.some((product: any) => 
            product.product_name?.toLowerCase().includes(searchLower)
          )) return true;
          
          return false;
        });
      }

      // Apply category filter
      if (selectedCategory !== "all") {
        result = result.filter(post => 
          post.post_tags?.some((tag: any) => tag.name === selectedCategory)
        );
      }

      return result;
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = (
    e: React.MouseEvent,
    postId: string,
    isLiked: boolean
  ) => {
    e.stopPropagation();
    likePostMutation.mutate({ postId, isLiked });
  };

  const handleShare = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this post",
          text: "Check out this amazing post!",
          url: `${window.location.origin}/posts/${postId}`,
        });
      } catch (error) {
        console.log("Share failed:", error);
      }
    } else if (navigator.clipboard) {
      navigator.clipboard
        .writeText(`${window.location.origin}/posts/${postId}`)
        .then(() => {
          toast({
            title: "Link copied!",
            description: "Post link copied to clipboard.",
          });
        });
    } else {
      toast({
        title: "Share feature coming soon!",
        description: "Advanced sharing options will be available soon.",
      });
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  // Handle click on tagged entity
  const handleTagClick = async (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    const cleanTag = tag.slice(1); // Remove '@' symbol
    // Fetch entity details to determine type (simplified approach)
    const [userRes, productRes, groupRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${cleanTag}%`)
        .limit(1),
      supabase
        .from("products")
        .select("id")
        .ilike("name", `%${cleanTag}%`)
        .limit(1),
      supabase
        .from("groups")
        .select("id")
        .ilike("name", `%${cleanTag}%`)
        .limit(1),
    ]);

    if (userRes.data?.length) {
      navigate(`/users/${userRes.data[0].id}`);
    } else if (productRes.data?.length) {
      navigate(`/products/${productRes.data[0].id}`);
    } else if (groupRes.data?.length) {
      navigate(`/groups/${groupRes.data[0].id}`);
    } else {
      toast({
        title: "Not Found",
        description: "The tagged entity could not be found.",
        variant: "destructive",
      });
    }
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostForComments(postId);
  };

  const handlePostClick = (postId: string) => {
    setSelectedPostForComments(postId);
  };

  // Render content with highlighted tags
  const renderContentWithTags = (content: string, postId: string) => {
    const tagRegex = /@[\w-]+/g;
    const parts = content.split(tagRegex);
    const tags = content.match(tagRegex) || [];

    return parts.reduce((acc, part, index) => {
      acc.push(<span key={`part-${index}`}>{part}</span>);
      if (index < tags.length) {
        acc.push(
          <span
            key={`tag-${index}`}
            className="text-pink-500 underline cursor-pointer"
            onClick={(e) => handleTagClick(e, tags[index])}
          >
            {tags[index]}
          </span>
        );
      }
      return acc;
    }, [] as JSX.Element[]);
  };



  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mt-20 mx-auto">
            {/* Instagram-style Post Creator */}
            <div className="mb-8">
              <InstagramStylePostCreator />
            </div>

            {/* Search and Filter Section - horizontal pill style */}
            <div className="mb-8 flex flex-col sm:flex-row items-center gap-3 justify-center w-full">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="rounded-full pl-12 pr-10 py-2 border-2 border-pink-200 focus:border-pink-400 bg-white text-gray-700 shadow-none focus:ring-0 transition-all"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearAllFilters}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-pink-400 hover:bg-pink-100 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="rounded-full border-2 border-pink-200 focus:border-pink-400 bg-white text-gray-700 shadow-none focus:ring-0 w-48 h-11 px-6">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value} className="capitalize">
                      {category.value === "all" ? "All Categories" : category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Button (always visible if any filter is active) */}
              {(searchQuery || selectedCategory !== "all") && (
                <Button
                  onClick={clearAllFilters}
                  className="rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center gap-2 px-6 h-11 font-semibold shadow-none"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Posts Feed - only this section shows loading */}
            <div className="space-y-6 min-h-[300px]">
              {isLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="smooth-card p-6 animate-pulse flex flex-col gap-4 rounded-2xl bg-white/80 border border-pink-100">
                      <div className="h-4 bg-pink-100 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-pink-100 rounded w-2/3"></div>
                      <div className="h-32 bg-pink-50 rounded-xl"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onUserClick={handleUserClick}
                      onCommentClick={handleCommentClick}
                    />
                  ))}

                  {posts.length === 0 && (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        {searchQuery || selectedCategory !== "all" ? "No posts found" : "No posts yet"}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery || selectedCategory !== "all" 
                          ? "Try adjusting your search or filter criteria."
                          : "Be the first to share something with the community!"
                        }
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        <Button
          variant="default"
          size="icon"
          onClick={scrollToTop}
          className={`fixed bottom-8 right-4 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all duration-300 ease-in-out z-50 ${
            showScrollToTop
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>

      {/* Comments Dialog */}
      <CommentsDialog
        postId={selectedPostForComments || ""}
        isOpen={!!selectedPostForComments}
        onOpenChange={(open) => !open && setSelectedPostForComments(null)}
      />
    </Layout>
  );
};

export default Feed;