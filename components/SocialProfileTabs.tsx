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
  const isAdmin = currentUser?.role === 'admin' || profileRole === 'admin';
  const isViewingVendor = isVendor;
  // Show orders tab for own profile OR if admin viewing their own profile
  const canViewOrders = isOwnProfile || (isAdmin && isOwnProfile);
  // Show groups tab for own profile OR if admin
  const canViewGroups = isOwnProfile || (isAdmin && isOwnProfile);

  // Fetch posts - if admin viewing own profile, fetch all posts
  const { data: postsResponse, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', profileUserId, isAdmin && isOwnProfile],
    queryFn: async () => {
      if (isAdmin && isOwnProfile) {
        // Fetch all posts for admin
        const { data } = await apiClient.get('/admin/posts');
        return data;
      } else {
        // Fetch user-specific posts
        const { data } = await apiClient.get('/posts', {
          params: { userId: profileUserId, limit: 100 },
        });
        return data;
      }
    },
    enabled: !!profileUserId,
  });

  const posts = isAdmin && isOwnProfile 
    ? (postsResponse?.data?.posts || [])
    : (postsResponse?.data || []);

  // Fetch groups - if admin viewing own profile, fetch all groups
  const { data: userGroupsResponse, isLoading: groupsLoading } = useQuery({
    queryKey: ['user-groups', profileUserId, isAdmin && isOwnProfile],
    queryFn: async () => {
      const { data } = await apiClient.get('/groups', {
        params: {},
      });
      return data;
    },
    enabled: canViewGroups && !!profileUserId,
  });

  // Filter groups based on whether admin or regular user
  const userGroups = isAdmin && isOwnProfile
    ? (userGroupsResponse?.data?.groups || []) // Show all groups for admin
    : (userGroupsResponse?.data?.groups || []).filter(
        (group: any) => group.creatorId === profileUserId
      );

  // Fetch orders - different logic for vendors vs users vs admin
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', profileUserId, isVendor, isAdmin && isOwnProfile],
    queryFn: async () => {
      if (isAdmin && isOwnProfile) {
        // For admin, fetch all orders
        const { data } = await apiClient.get('/orders', {
          params: {},
        });
        return data;
      } else if (isVendor && currentUser?.id === profileUserId) {
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

  // Handle orders based on vendor, user, or admin
  let orders: any[] = [];
  if (isAdmin && isOwnProfile) {
    // Admin sees all orders
    orders = ordersResponse?.data?.orders || [];
  } else if (isVendor && currentUser?.id === profileUserId) {
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
          <TabsTrigger value="posts">
            Posts
            {isAdmin && isOwnProfile && ` (All)`}
          </TabsTrigger>
          {canViewGroups && (
            <TabsTrigger value="groups">
              Groups
              {isAdmin && isOwnProfile && ` (All)`}
            </TabsTrigger>
          )}
          {canViewOrders && (
            <TabsTrigger value="orders">
              Orders
              {isAdmin && isOwnProfile && ` (All)`}
            </TabsTrigger>
          )}
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
                      <div className="flex flex-col items-end gap-1">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        {isAdmin && isOwnProfile && post.user && (
                          <span className="text-xs text-gray-400">
                            by {post.user.fullName || post.user.email?.split('@')[0] || 'Unknown'}
                          </span>
                        )}
                      </div>
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

        {canViewGroups && (
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
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {isAdmin && isOwnProfile && group.creator 
                              ? `by ${group.creator.fullName || group.creator.email?.split('@')[0] || 'Unknown'}` 
                              : 'Group'}
                          </p>
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
                            {(isAdmin && isOwnProfile || isVendorOrder) && order.user && (
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
          {isAdmin && isOwnProfile ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">Admin Dashboard Access</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Access the full admin dashboard to manage users, products, orders, KYC requests, and more.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {posts.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Posts</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {orders.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Orders</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {userGroups.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Groups</div>
                    </CardContent>
                  </Card>
                </div>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go to Admin Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Activity feed coming soon
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialProfileTabs;
