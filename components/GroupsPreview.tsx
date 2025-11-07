'use client';

import { Button } from "@/components/ui/button";
import { UsersThree, Package, ArrowRight } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

const GroupsPreview = () => {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ['groups-preview'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/groups');
        const publicGroups = (data?.groups || []).filter((g: any) => !g.isPrivate).slice(0, 10);
        
        return publicGroups.map((group: any) => ({
          id: group.id,
          name: group.name,
          description: group.description || 'A great shopping group',
          members: group._count?.members || 0,
          image: group.product?.images?.[0]?.imageUrl || group.product?.imageUrl || `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop`,
          productName: group.product?.name || 'Product',
          creatorName: group.creator?.fullName || group.creator?.email?.split('@')[0] || 'User',
          created_at: group.createdAt
        }));
      } catch (error) {
        console.error('GroupsPreview: Error in query function:', error);
        throw error;
      }
    },
  });

  // Continuous scroll functionality
  useEffect(() => {
    if (!groups.length || groups.length <= 1) return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationFrame: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame
    const cardWidth = 310; // card width + gap
    const totalWidth = cardWidth * groups.length;

    const animate = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += scrollSpeed;
        
        // Reset position when we've scrolled through all original cards
        if (scrollPosition >= totalWidth) {
          scrollPosition = 0;
        }
        
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [groups.length, isPaused]);

  const handleGroupClick = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  console.log('GroupsPreview: Component render state:', { 
    groupsCount: groups.length, 
    isLoading, 
    error: error?.message 
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold  text-gray-900 mb-4">Active Groups</h2>
              <p className="text-xl text-gray-600">Join groups and share experiences</p>
            </div>
            
            {/* Loading horizontal scroll */}
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-72 bg-white rounded-2xl shadow-lg p-4 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Active Groups</h2>
              <p className="text-xl text-gray-600">Join groups and share experiences</p>
            </div>
            
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 shadow-sm">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading groups</h3>
                <p className="text-red-600">{error.message}</p>
              </div>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-semibold py-2 px-6 rounded-full transition-all duration-300"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Active Groups</h2>
              <p className="text-xl text-gray-600">Join groups and share experiences</p>
            </div>
            
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <UsersThree size={64} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups yet</h3>
              <p className="text-gray-500 max-w-md mx-auto">Be the first to create a group and start building community!</p>
              <Button 
                onClick={() => router.push('/groups')}
                className="mt-6 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-semibold py-2 px-6 rounded-full transition-all duration-300"
              >
                Create First Group
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 overflow-hidden">
      <div className="w-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="flex items-center justify-between mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className="text-5xl  font-extrabold text-rose-800 mb-2">Active Groups</h2>
            <p className="text-xl text-gray-600">Join groups and share experiences</p>
            </div>
            
            <Button 
              onClick={() => router.push('/groups')}
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
          
          <div className="relative">
            <motion.div 
              ref={scrollRef}
              className="flex gap-6 overflow-x-hidden scrollbar-hide p-4"
              style={{ scrollBehavior: 'auto' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
            <AnimatePresence>
                {[...groups, ...groups, ...groups].map((group, index) => (
                <motion.div
                    key={`${group.id}-${index}`}
                    className="flex-shrink-0 w-72 bg-white rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-gray-200"
                  onClick={() => handleGroupClick(group.id)}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: (index % groups.length) * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                >
                  <div className="relative">
                    <img 
                      src={group.image} 
                      alt={group.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 left-4">
                        <span className="bg-white/90 backdrop-blur-sm text-pink-600 px-3 py-2 rounded-full text-sm font-medium flex items-center shadow-md">
                        <Package size={16} className="mr-1" />
                        {group.productName}
                      </span>
                    </div>
                      <div className="absolute top-4 right-4">
                        <span className="bg-pink-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          New
                        </span>
                      </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">{group.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{group.description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-pink-600">
                        <UsersThree size={20} className="mr-2" />
                        <span className="font-medium text-sm">{group.members} members</span>
                      </div>
                      <span className="text-sm text-gray-500">by {group.creatorName}</span>
                    </div>
                      
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupClick(group.id);
                      }}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-semibold py-2 rounded-full transition-all duration-300"
                    >
                        Join Group
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            </motion.div>

            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10"></div>
          </div>
          
          <div className="text-center mt-8 md:hidden">
            <Button 
              onClick={() => router.push('/groups')}
              className="bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300"
            >
              View All Groups
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GroupsPreview;