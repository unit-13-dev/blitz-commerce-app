import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Lock, ArrowLeft, ShoppingBag, UserPlus, Settings, Key, Copy, Clock, CreditCard, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import InviteMembersDialog from "@/components/InviteMembersDialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ImageGallery from "@/components/ImageGallery";

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  console.log('GroupDetail: Component loading with groupId:', groupId, 'user:', user?.id);

  // Fetch group details with proper error handling and separate queries
  const { data: group, isLoading, error, refetch } = useQuery({
    queryKey: ['group', groupId],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    queryFn: async () => {
      console.log('GroupDetail: Fetching group details for:', groupId);
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
      // Get basic group data
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      console.log('GroupDetail: Basic group query result:', { groupData, groupError });
      
      if (groupError) {
        console.error('GroupDetail: Group query error:', groupError);
        throw groupError;
      }
      
      if (!groupData) {
        throw new Error('Group not found');
      }
      
      // Get related data in parallel
      const [creatorResult, productResult, membersResult, statusResult, paymentsResult] = await Promise.allSettled([
        // Creator profile
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', groupData.creator_id)
          .single(),
        
        // Product details
        groupData.product_id ? supabase
          .from('products')
          .select('*')
          .eq('id', groupData.product_id)
          .single() : Promise.resolve({ data: null }),
        
        // Group members
        supabase
          .from('group_members')
          .select('user_id, joined_at')
          .eq('group_id', groupId),
        
        // Group order status
        supabase
          .from('group_order_status')
          .select('*')
          .eq('group_id', groupId)
          .single(),
        
        // Group order payments
        supabase
          .from('group_order_payments')
          .select(`
            *,
            user:profiles!user_id (
              full_name,
              email
            )
          `)
          .eq('group_id', groupId)
      ]);
      
      console.log('GroupDetail: Parallel queries results:', {
        creatorResult,
        productResult,
        membersResult,
        statusResult,
        paymentsResult
      });
      
      // Debug: Log the status and payments data specifically
      if (statusResult.status === 'fulfilled' && statusResult.value.data) {
        console.log('GroupDetail: Status data:', statusResult.value.data);
      }
      
      if (paymentsResult.status === 'fulfilled' && paymentsResult.value.data) {
        console.log('GroupDetail: Payments data:', paymentsResult.value.data);
      }
      
      let creatorProfile = null;
      let product = null;
      let members = [];
      let status = null;
      let payments = [];
      
      if (creatorResult.status === 'fulfilled' && creatorResult.value.data) {
        creatorProfile = creatorResult.value.data;
      }
      
      if (productResult.status === 'fulfilled' && productResult.value.data) {
        product = productResult.value.data;
      }
      
      if (membersResult.status === 'fulfilled' && membersResult.value.data) {
        members = membersResult.value.data;
      }
      
      if (statusResult.status === 'fulfilled' && statusResult.value.data) {
        status = statusResult.value.data;
      }
      
      if (paymentsResult.status === 'fulfilled' && paymentsResult.value.data) {
        payments = paymentsResult.value.data;
      }
      
      // Check if current user is a member
      const isMember = user?.id ? members.some(member => member.user_id === user.id) : false;
      
      // Check if current user is the creator
      const isCreator = user?.id === groupData.creator_id;
      
      // Check if current user has paid
      const userPayment = payments.find(payment => payment.user_id === user?.id);
      
      return {
        ...groupData,
        creator_profile: creatorProfile,
        product,
        members,
        status,
        payments,
        is_member: isMember,
        is_creator: isCreator,
        user_payment: userPayment
      };
    },
    enabled: !!groupId && !!user
  });

  // Fetch user addresses for payment


  // Fetch discount tiers for the product
  const { data: discountTiers = [] } = useQuery({
    queryKey: ['discount-tiers', group?.product_id],
    queryFn: async () => {
      if (!group?.product_id) return [];
      
      const { data, error } = await supabase
        .from('product_discount_tiers')
        .select('*')
        .eq('product_id', group.product_id)
        .order('members_required', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!group?.product_id
  });

  // Fetch product images for the gallery
  const { data: productImages = [] } = useQuery({
    queryKey: ['product-images', group?.product_id],
    queryFn: async () => {
      if (!group?.product_id) return [];
      
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', group.product_id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!group?.product_id
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          product_id: productId,
          quantity: 1
        }, {
          onConflict: 'user_id,product_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Added to Cart!",
        description: "Product has been added to your cart.",
      });
    },
    onError: (error) => {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add product to cart.",
        variant: "destructive"
      });
    }
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      if (!user || !groupId) {
        throw new Error('Missing required data');
      }
      
      console.log('=== JOIN GROUP MUTATION START ===');
      console.log('Group:', groupId, 'User:', user.id, 'Access Code:', accessCode);
      
      // Verify access code
      if (group?.access_code !== accessCode) {
        throw new Error('Invalid access code. Please check and try again.');
      }
      
      // Check if already a member
      if (group?.is_member) {
        throw new Error('You are already a member of this group.');
      }
      
      // Join the group
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });
      
      if (joinError) {
        console.error('Join error:', joinError);
        if (joinError.code === '23505') {
          throw new Error('You are already a member of this group.');
        }
        throw joinError;
      }
      
      console.log('Successfully joined group');
      return { action: 'joined' };
    },
    onSuccess: (result) => {
      console.log('Join mutation success:', result);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      
      // Show success message
      toast({
        title: "Joined Group!",
        description: `Welcome to ${group?.name}!`,
      });
      
      setShowJoinDialog(false);
      setAccessCode("");
    },
    onError: (error: any) => {
      console.error('Join mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive"
      });
    }
  });



  // Finalize group order mutation
  const finalizeGroupOrderMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error('Group ID is required');
      
      const { data, error } = await supabase.rpc('finalize_group_order', {
        group_uuid: groupId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast({
        title: "Group Order Finalized!",
        description: `Order #${result.order_number} has been placed with ${result.participant_count} participants.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Finalization Failed",
        description: error.message || "Failed to finalize group order",
        variant: "destructive"
      });
    }
  });

  // Cancel group order mutation
  const cancelGroupOrderMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error('Group ID is required');
      
      const { data, error } = await supabase.rpc('refund_group_order_participants', {
        group_uuid: groupId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast({
        title: "Group Order Cancelled",
        description: `Refunds have been processed for ${result.refunded_count} participants.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel group order",
        variant: "destructive"
      });
    }
  });

  // Handle functions
  const handleJoinGroup = () => {
      setShowJoinDialog(true);
  };

  const handleJoinWithCode = () => {
    if (!accessCode.trim()) {
      toast({
        title: "Access Code Required",
        description: "Please enter the 8-digit access code",
        variant: "destructive"
      });
      return;
    }
    joinGroupMutation.mutate(accessCode);
  };

  const handleLeaveGroup = () => {
    // Implement leave group logic
  };

  const handleCopyAccessCode = async () => {
    if (group?.access_code) {
    try {
      await navigator.clipboard.writeText(group.access_code);
      toast({
          title: "Access Code Copied!",
        description: "The access code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
          title: "Copy Failed",
          description: "Failed to copy access code",
          variant: "destructive"
      });
      }
    }
  };

  const handleAddToCart = () => {
    if (group?.product?.id) {
      addToCartMutation.mutate(group.product.id);
    }
  };



  const handleFinalizeOrder = () => {
    navigate(`/checkout?type=group&groupId=${groupId}`);
  };

  const handleCancelOrder = () => {
    cancelGroupOrderMutation.mutate();
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!group?.finalization_deadline) return null;
    
    const deadline = new Date(group.finalization_deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return { expired: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, expired: false };
  };

  const timeRemaining = getTimeRemaining();

  // Calculate progress for discount tiers
  const getDiscountProgress = () => {
    if (!discountTiers.length || !group?.status) return null;
    
    const paidParticipants = group.status.paid_participants;
    const maxTier = Math.max(...discountTiers.map(tier => tier.members_required));
    const progress = Math.min((paidParticipants / maxTier) * 100, 100);
    
    return {
      current: paidParticipants,
      max: maxTier,
      progress,
      currentTier: group.status.current_tier,
      currentDiscount: group.status.current_discount_percentage
    };
  };

  const discountProgress = getDiscountProgress();

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-6"></div>
                <div className="h-64 bg-gray-200 rounded mb-6"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Group</h1>
                <p className="text-gray-600 mb-6">{error.message}</p>
                <Button onClick={() => navigate('/groups')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Groups
              </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Group Not Found</h1>
                <p className="text-gray-600 mb-6">The group you're looking for doesn't exist or you don't have access to it.</p>
                <Button onClick={() => navigate('/groups')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Groups
              </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isCreator = group.is_creator;
  const isMember = group.is_member;
  const hasPaid = group.user_payment?.payment_status === 'paid';
  const isGroupActive = group.is_active;
  const isGroupFinalized = group.status?.status === 'finalized';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/groups')}
              className="mb-6 text-pink-600 hover:bg-pink-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Button>

            {/* Group Header */}
            <div className="smooth-card p-6 mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                    {group.is_private && <Lock className="w-5 h-5 text-gray-500" />}
                    {!isGroupActive && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                        {isGroupFinalized ? 'Finalized' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                  
                  {group.description && (
                    <p className="text-gray-600 mb-4">{group.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{group.members?.length || 0} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                    </div>
                    {group.order_number && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Order #:</span>
                        <span className="text-sm font-medium font-mono text-blue-600">{group.order_number}</span>
                      </div>
                    )}
                  </div>
                  </div>

                <div className="flex gap-2">
                  {/* Refresh button for all users */}
                  <Button 
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    className="mr-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  
                  {isCreator && isGroupActive && (
                    <>
                      <Button 
                        onClick={() => setShowInviteDialog(true)}
                        className="bg-pink-600 hover:bg-pink-700"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite
                      </Button>
                      <Button 
                        onClick={handleFinalizeOrder}
                        disabled={finalizeGroupOrderMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finalize Order
                      </Button>
                      <Button 
                        onClick={handleCancelOrder}
                        disabled={cancelGroupOrderMutation.isPending}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                    )}

                  {!isMember && isGroupActive && (
                    <Button onClick={handleJoinGroup} className="bg-pink-600 hover:bg-pink-700">
                          <UserPlus className="w-4 h-4 mr-2" />
                      Join Group
                        </Button>
                    )}
                </div>
              </div>

              {/* Group Order Status */}
              {isMember && group.status && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Group Order Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Time Remaining */}
                      {timeRemaining && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Time Remaining:</span>
                          {timeRemaining.expired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="outline">
                              {timeRemaining.hours}h {timeRemaining.minutes}m
                            </Badge>
                    )}
                  </div>
                      )}

                      {/* Discount Progress */}
                      {discountProgress && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Discount Progress</span>
                            <span>{discountProgress.current} / {discountProgress.max} participants</span>
                          </div>
                          <Progress value={discountProgress.progress} className="h-2" />
                          <div className="flex items-center justify-between text-sm">
                            <span>Current Discount:</span>
                            <Badge variant="secondary">{discountProgress.currentDiscount}%</Badge>
                </div>
              </div>
            )}

                      {/* Payment Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Your Payment Status:</span>
                        {hasPaid ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
              </div>
                  </CardContent>
                </Card>
            )}

              {/* Product Image Gallery */}
              {group.product && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Product Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageGallery 
                      images={productImages}
                      productName={group.product.name}
                      fallbackImage={group.product.image_url}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Product Information */}
              {group.product && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {group.product.image_url && (
                        <img
                          src={group.product.image_url}
                          alt={group.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{group.product.name}</h3>
                        <p className="text-gray-600">{group.product.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-lg font-bold text-pink-600">
                            ₹{group.product.price}
                            </span>
                          {group.status?.current_discount_percentage > 0 && (
                            <Badge variant="secondary">
                              {group.status.current_discount_percentage}% off
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddToCart} variant="outline">
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                        {isMember && !hasPaid && isGroupActive && (
                          <Button onClick={() => navigate(`/checkout?type=group&groupId=${groupId}`)}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Participants List */}
              {isMember && group.payments && group.payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Participants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {group.payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>
                                {payment.user?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{payment.user?.full_name || 'Unknown User'}</p>
                              <p className="text-sm text-gray-500">
                                Qty: {payment.quantity} × ₹{payment.unit_price}
                              </p>
                              {payment.order_number && (
                                <p className="text-xs text-blue-600 font-mono">
                                  Order: {payment.order_number}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{payment.final_price}</p>
                            <Badge
                              variant={payment.payment_status === 'paid' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {payment.payment_status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                            {payment.discount_percentage > 0 && (
                              <p className="text-xs text-green-600 mt-1">
                                {payment.discount_percentage}% off
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                </div>
                  </CardContent>
                </Card>
              )}
      </div>

            {/* Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogContent>
          <DialogHeader>
                  <DialogTitle>Join Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                type="text"
                      placeholder="Enter 8-digit code"
                value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      maxLength={8}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleJoinWithCode}
                      disabled={joinGroupMutation.isPending}
                      className="flex-1"
              >
                      {joinGroupMutation.isPending ? 'Joining...' : 'Join Group'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJoinDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



            {/* Invite Dialog */}
        <InviteMembersDialog
              isOpen={showInviteDialog}
              onOpenChange={setShowInviteDialog}
          groupId={groupId!}
              groupName={group.name}
              accessCode={group.access_code}
        />
          </div>
        </div>
        </div>
    </Layout>
  );
};

export default GroupDetail;
