'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Users, Package, Eye, Settings, Trash2, Badge as BadgeIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface SocialProfileTabsProps {
  profileUserId: string;
  isOwnProfile: boolean;
  profileRole?: string;
}

const SocialProfileTabs = ({ profileUserId, isOwnProfile, profileRole }: SocialProfileTabsProps) => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isVendor = profileRole === 'vendor' || profileRole === 'Vendor';
  const isViewingVendor = isVendor;
  const canViewOrders = isOwnProfile; // Only show orders tab for own profile

  // Fetch posts
  const { data: postsResponse, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', profileUserId],
    queryFn: async () => {
      const { data } = await apiClient.get('/posts', {
        params: { userId: profileUserId, limit: 100 },
      });
      return data;
    },
    enabled: !!profileUserId,
  });

  const posts = postsResponse?.data || [];

  // Fetch groups (only for own profile)
  const { data: userGroupsResponse, isLoading: groupsLoading } = useQuery({
    queryKey: ['user-groups', profileUserId],
    queryFn: async () => {
      const { data } = await apiClient.get('/groups', {
        params: {},
      });
      return data;
    },
    enabled: isOwnProfile && !!profileUserId,
  });

  const userGroups = (userGroupsResponse?.data?.groups || []).filter(
    (group: any) => group.creatorId === profileUserId
  );

  // Fetch orders - different logic for vendors vs users
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', profileUserId, isVendor],
    queryFn: async () => {
      if (isVendor && currentUser?.id === profileUserId) {
        // For vendors, fetch vendor orders (orders for their products)
        const { data } = await apiClient.get('/vendor/orders', {
          params: { status: 'all' },
        });
        return data;
      } else {
        // For users, fetch customer orders
        const { data } = await apiClient.get('/orders', {
          params: {},
        });
        return data;
      }
    },
    enabled: canViewOrders && !!profileUserId && !!currentUser?.id,
  });

  // Handle orders based on vendor or user
  let orders: any[] = [];
  if (isVendor && currentUser?.id === profileUserId) {
    // Vendor orders
    orders = ordersResponse?.data?.orders || [];
  } else {
    // User orders - filter by userId
    const allOrders = ordersResponse?.data?.orders || [];
    orders = allOrders.filter((order: any) => order.userId === profileUserId);
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="groups">Groups</TabsTrigger>}
          {canViewOrders && <TabsTrigger value="orders">Orders</TabsTrigger>}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {postsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : (
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
          )}
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="groups">
            {groupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            ) : (
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
            )}
          </TabsContent>
        )}

        {canViewOrders && (
          <TabsContent value="orders">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => {
                  // Determine if this is a vendor order or customer order
                  const isVendorOrder = isVendor && currentUser?.id === profileUserId;
                  
                  return (
                    <Card 
                      key={order.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        if (isVendorOrder) {
                          // For vendor orders, maybe show vendor order detail or regular order detail
                          router.push(`/orders/${order.id}`);
                        } else {
                          router.push(`/orders/${order.id}`);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">Order #{order.orderNumber}</h4>
                              {order.status && (
                                <Badge 
                                  variant={
                                    order.status === 'delivered' ? 'default' :
                                    order.status === 'confirmed' ? 'default' :
                                    order.status === 'pending' ? 'outline' :
                                    order.status === 'rejected' || order.status === 'cancelled' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {order.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                            {isVendorOrder && order.user && (
                              <p className="text-xs text-gray-500 mt-1">
                                Customer: {order.user.fullName || order.user.email}
                              </p>
                            )}
                          </div>
                          <span className="text-lg font-bold">₹{typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount).toFixed(2) : order.totalAmount.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {order.expectedDeliveryDate && (
                          <div className="mt-2 text-xs text-gray-500">
                            Expected delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {orders.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No orders yet
                  </div>
                )}
              </div>
            )}
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
