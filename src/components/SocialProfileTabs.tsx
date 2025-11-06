
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Users, Package, Eye, Settings, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SocialProfileTabsProps {
  profileUserId: string;
  isOwnProfile: boolean;
}

const SocialProfileTabs = ({ profileUserId, isOwnProfile }: SocialProfileTabsProps) => {
  // Fetch user's posts
  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', profileUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profileUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's groups (only if own profile) - simplified query without product join
  const { data: userGroups = [] } = useQuery({
    queryKey: ['user-groups', profileUserId],
    queryFn: async () => {
      if (!isOwnProfile) return [];
      
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('creator_id', profileUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isOwnProfile,
  });

  // Fetch user's orders (only if own profile)
  const { data: orders = [] } = useQuery({
    queryKey: ['user-orders', profileUserId],
    queryFn: async () => {
      if (!isOwnProfile) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (
              name,
              image_url
            )
          )
        `)
        .eq('user_id', profileUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isOwnProfile,
  });

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
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                    {post.content}
                  </p>
                  
                  {post.image_url && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={post.image_url} 
                        alt="Post content"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.views_count || 0}
                      </span>
                    </div>
                    <span>{new Date(post.created_at!).toLocaleDateString()}</span>
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
              {userGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img 
                        src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=40&h=40&fit=crop"
                        alt="Group"
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Group</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {group.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Users className="w-3 h-3" />
                        {group.max_members} max
                      </span>
                      <span className="text-xs text-gray-500">
                        {group.is_private ? 'Private' : 'Public'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {userGroups.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No groups created yet
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {isOwnProfile && (
          <TabsContent value="orders">
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">Order #{order.id.slice(0, 8)}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Status: <span className="capitalize">{order.status}</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.created_at!).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-lg font-semibold">₹{order.total_amount}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded p-2">
                          <img 
                            src={item.products?.image_url || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=30&h=30&fit=crop"}
                            alt={item.products?.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                          <span className="text-xs">{item.products?.name} x{item.quantity}</span>
                        </div>
                      ))}
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
            Activity feed coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialProfileTabs;
