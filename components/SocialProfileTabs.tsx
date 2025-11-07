'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Users, Package, Eye, Settings, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface SocialProfileTabsProps {
  profileUserId: string;
  isOwnProfile: boolean;
}

const SocialProfileTabs = ({ profileUserId, isOwnProfile }: SocialProfileTabsProps) => {
  const router = useRouter();

  const { data: postsResponse } = useQuery({
    queryKey: ['user-posts', profileUserId],
    queryFn: async () => {
      const { data } = await apiClient.get('/posts', {
        params: { userId: profileUserId, limit: 100 },
      });
      return data;
    },
  });

  const posts = postsResponse?.posts || [];

  const { data: userGroupsResponse } = useQuery({
    queryKey: ['user-groups', profileUserId],
    queryFn: async () => {
      const { data } = await apiClient.get('/groups', {
        params: {},
      });
      return data;
    },
    enabled: isOwnProfile,
  });

  const userGroups = (userGroupsResponse?.groups || []).filter(
    (group: any) => group.creatorId === profileUserId
  );

  const { data: ordersResponse } = useQuery({
    queryKey: ['user-orders', profileUserId],
    queryFn: async () => {
      const { data } = await apiClient.get('/orders', {
        params: {},
      });
      return data;
    },
    enabled: isOwnProfile,
  });

  const orders = (ordersResponse?.orders || []).filter(
    (order: any) => order.userId === profileUserId
  );

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="groups">Groups</TabsTrigger>}
          {isOwnProfile && <TabsTrigger value="orders">Orders</TabsTrigger>}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post: any) => (
              <Card 
                key={post.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/posts/${post.id}`)}
              >
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                    {post.content}
                  </p>
                  
                  {post.images && post.images.length > 0 && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={post.images[0]?.imageUrl} 
                        alt="Post content"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post._count?.likes || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post._count?.comments || 0}
                      </span>
                    </div>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                No posts yet
              </div>
            )}
          </div>
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="groups">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userGroups.map((group: any) => (
                <Card 
                  key={group.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/groups/${group.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img 
                        src={group.product?.images?.[0]?.imageUrl || group.product?.imageUrl || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=40&h=40&fit=crop"}
                        alt="Group"
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Group</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group._count?.members || 0} members
                      </span>
                      <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {userGroups.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No groups yet
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {isOwnProfile && (
          <TabsContent value="orders">
            <div className="space-y-4">
              {orders.map((order: any) => (
                <Card 
                  key={order.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">Order #{order.orderNumber}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-lg font-bold">₹{parseFloat(order.totalAmount.toString()).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No orders yet
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="activity">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Activity feed coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialProfileTabs;
