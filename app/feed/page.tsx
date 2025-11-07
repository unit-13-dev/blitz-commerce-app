'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteQuery } from "@tanstack/react-query";
import InstagramStylePostCreator from "@/components/InstagramStylePostCreator";
import PostCard from "@/components/PostCard";
import { apiClient } from "@/lib/api-client";

const Feed = () => {
  const { user } = useAuth();
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await apiClient.get('/posts', {
        params: { page: pageParam, limit: 20 },
      });
      return data;
    },
    getNextPageParam: (lastPage: any, allPages) => {
      const hasMore = lastPage?.meta?.pagination 
        ? allPages.length < lastPage.meta.pagination.totalPages 
        : false;
      return hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  const posts = data?.pages.flatMap((page: any) => page?.data || []) || [];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }

      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && posts.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading feed...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {user && (
          <div className="mb-6 mt-20">
            <InstagramStylePostCreator />
          </div>
        )}

        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map((post: any) => (
              <PostCard
                key={post?.id}
                post={post}
                onCommentClick={() => setSelectedPostForComments(post.id)}
              />
            ))
          )}

          {isFetchingNextPage && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
            </div>
          )}
        </div>

        {showScrollToTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 rounded-full w-12 h-12 p-0 shadow-lg"
            size="icon"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>
    </Layout>
  );
};

export default Feed;

