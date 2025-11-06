
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share2, ShoppingCart, User, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const UserDashboard = () => {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
  });

  // Fetch user's posts
  const { data: posts } = useQuery({
    queryKey: ['user-posts', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch user's cart
  const { data: cartItems } = useQuery({
    queryKey: ['cart', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', profile?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch user's orders
  const { data: orders } = useQuery({
    queryKey: ['orders', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const handleProfileUpdate = async () => {
    const { error } = await updateProfile(profileForm);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setEditingProfile(false);
    }
  };

  const handleBecomeVendor = async () => {
    const { error } = await updateProfile({ role: 'vendor' });
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to become vendor',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'You are now a vendor! Please complete KYC verification.',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto mt-24">
        <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="posts">My Posts</TabsTrigger>
            <TabsTrigger value="cart">Shopping Cart</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleProfileUpdate}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setEditingProfile(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm text-gray-600">{profile?.email}</p>
                    </div>
                    <div>
                      <Label>Full Name</Label>
                      <p className="text-sm text-gray-600">{profile?.full_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label>Role</Label>
                      <p className="text-sm text-gray-600 capitalize">{profile?.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setEditingProfile(true)}>Edit Profile</Button>
                      {profile?.role === 'user' && (
                        <Button variant="outline" onClick={handleBecomeVendor}>
                          Become a Vendor
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card>
              <CardHeader>
                <CardTitle>My Posts ({posts?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {posts?.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4">
                      <p className="mb-3">{post.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {post.comments_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-4 h-4" />
                          {post.shares_count}
                        </span>
                        <span className="ml-auto">
                          {new Date(post.created_at!).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!posts || posts.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No posts yet. Start sharing!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cart">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Shopping Cart ({cartItems?.length || 0} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.products?.name}</h4>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="text-lg font-semibold">₹{item.products?.price}</p>
                      </div>
                    </div>
                  ))}
                  {!cartItems || cartItems.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Your cart is empty</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order History ({orders?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders?.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">Order #{order.id.slice(0, 8)}</h4>
                          <p className="text-sm text-gray-600">Status: {order.status}</p>
                          <p className="text-sm text-gray-600">
                            Date: {new Date(order.created_at!).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-lg font-semibold">₹{order.total_amount}</p>
                      </div>
                    </div>
                  ))}
                  {!orders || orders.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No orders yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;
