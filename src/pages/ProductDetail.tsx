import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProductRating } from "@/hooks/useProductRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, ArrowLeft, Share2, Minus, Plus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import ReviewSummary from "@/components/ReviewSummary";
import ReviewList from "@/components/ReviewList";
import ReviewPostCreator from "@/components/ReviewPostCreator";
import { useState } from "react";
import StarRating from "@/components/StarRating";

const ProductDetail = () => {
  const { productId: id } = useParams(); // Changed: Use productId from params and alias as id
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch product details
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      
      console.log('Fetching product details for ID:', id);
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendor_profile:profiles!vendor_id (
            full_name,
            email,
            vendor_kyc_data:vendor_kyc!vendor_id (
              display_business_name,
              business_name
            )
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching product details:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('Product not found in Supabase for ID:', id);
        throw new Error('Product not found');
      }
      
      console.log('Raw product data from Supabase:', data);
      
      const profileData = data.vendor_profile;
      const kycDataFromProfile = profileData?.vendor_kyc_data;
      
      const kycDataForCard = Array.isArray(kycDataFromProfile) 
        ? kycDataFromProfile 
        : (kycDataFromProfile ? [kycDataFromProfile] : []);

      const cleanVendorProfile = profileData ? {
        full_name: profileData.full_name,
        email: profileData.email
      } : null;

      const processedProduct = {
        ...data,
        vendor_profile: cleanVendorProfile,
        vendor_kyc: kycDataForCard
      };
      
      console.log('Processed product for detail page:', processedProduct);
      return processedProduct;
    },
    enabled: !!id,
  });

  // Fetch product images
  const { data: productImages } = useQuery({
    queryKey: ['product-images', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('product_images')
        .select('image_url, display_order')
        .eq('product_id', id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Check if product is in cart and get quantity
  const { data: cartItem, refetch: refetchCartItem } = useQuery({
    queryKey: ['cart-item', user?.id, id],
    queryFn: async () => {
      if (!user || !id) return null;
      
      console.log('Fetching cart item for user:', user.id, 'product:', id);
      
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', id)
        .maybeSingle();
      
      if (error) throw error;
      
      console.log('Cart item result:', data);
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch discount tiers for this product
  const { data: tiers } = useQuery({
    queryKey: ['product-tiers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_discount_tiers')
        .select('*')
        .eq('product_id', id)
        .order('tier_number');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Determine if tiers exist
  const hasTiers = tiers && tiers.length > 0;

  // Check if product is in wishlist
  const { data: isInWishlist = false } = useQuery({
    queryKey: ['wishlist-status', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return false;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', id)
        .maybeSingle();
      
      if (error) {
        console.error('Wishlist check error:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user && !!id,
  });

  // Fetch average rating and review count
  const { data: ratingData } = useProductRating(id || '');

  // Fetch product categories
  const { data: productCategories } = useQuery({
    queryKey: ['product-categories', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('product_category_mappings')
        .select(`
          product_categories!inner(name)
        `)
        .eq('product_id', id);

      if (error) throw error;
      return data?.map((item: any) => item.product_categories.name) || [];
    },
    enabled: !!id,
  });

  // Wishlist mutations
  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Please login to add to wishlist');
      
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      toast({ title: "Added to wishlist" });
    },
    onError: (error: any) => {
      console.error('Add to wishlist error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Please login');
      
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      toast({ title: "Removed from wishlist" });
    },
    onError: (error: any) => {
      console.error('Remove from wishlist error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('Please login to add to cart');
      
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', id)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: id,
            quantity: 1
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all cart-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['cart-item', user?.id, id] });
      // Also trigger an immediate refetch
      refetchCartItem();
      toast({ title: "Added to cart" });
    },
    onError: (error: any) => {
      console.error('Add to cart error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Increment cart quantity mutation
  const incrementCartMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id || !cartItem) throw new Error('Cannot increment cart item');
      
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: cartItem.quantity + 1 })
        .eq('id', cartItem.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all cart-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['cart-item', user?.id, id] });
      // Also trigger an immediate refetch
      refetchCartItem();
      toast({ title: "Added to cart" });
    },
    onError: (error: any) => {
      console.error('Increment cart error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Decrement cart quantity mutation
  const decrementCartMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id || !cartItem) throw new Error('Cannot decrement cart item');
      
      if (cartItem.quantity <= 1) {
        // Remove item from cart if quantity would become 0
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', cartItem.id);
      
        if (error) throw error;
      } else {
        // Decrease quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: cartItem.quantity - 1 })
          .eq('id', cartItem.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all cart-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['cart-item', user?.id, id] });
      toast({ title: cartItem?.quantity <= 1 ? "Removed from cart" : "Updated cart" });
    },
    onError: (error: any) => {
      console.error('Decrement cart error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create group mutation - REMOVED: Now using CreateGroupModal
  // const createGroupMutation = useMutation({
  //   mutationFn: async () => {
  //     if (!user || !id) throw new Error('Please login to create a group');
  //     if (!product) throw new Error('Product data is not available');
  //     
  //     console.log('Creating group with data:', {
  //       name: groupForm.name,
  //       description: groupForm.description,
  //       creator_id: user.id,
  //       product_id: product.id,
  //     });
  //     
  //     const { data, error } = await supabase
  //       .from('groups')
  //       .insert({
  //         name: groupForm.name,
  //         description: groupForm.description,
  //         creator_id: user.id,
  //         product_id: product.id,
  //       })
  //       .select()
  //       .single();
  //     
  //     if (error) {
  //       console.error('Group creation error:', error);
  //       throw error;
  //     }
  //     
  //     return data;
  //   },
  //   onSuccess: (data) => {
  //     console.log('Group created successfully:', data);
  //     setIsGroupDialogOpen(false);
  //     setGroupForm({ name: '', description: '' });
  //     toast({ title: "Group created successfully!" });
  //     navigate('/groups');
  //   },
  //   onError: (error: any) => {
  //     console.error('Create group error:', error);
  //     toast({ 
  //       title: "Error creating group", 
  //       description: error.message || "Please try again later",
  //       variant: "destructive" 
  //     });
  //   },
  // });

  const handleWishlistToggle = () => {
    if (!user) {
      toast({ title: "Please login to add to wishlist" });
      return;
    }
    
    if (isInWishlist) {
      removeFromWishlistMutation.mutate();
    } else {
      addToWishlistMutation.mutate();
    }
  };

  const getVendorName = () => {
    if (product?.vendor_kyc && Array.isArray(product.vendor_kyc) && product.vendor_kyc.length > 0) {
      return product.vendor_kyc[0]?.display_business_name || 
             product.vendor_kyc[0]?.business_name;
    }
    return product?.vendor_profile?.full_name || 'Unknown Vendor';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-96 bg-gray-200 rounded"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">{error ? 'Error loading product' : 'Product not found'}</h1>
              <p className="text-gray-600 mb-6">
                {error ? error.message : "The product you're looking for doesn't exist or has been removed."}
              </p>
              <Button onClick={() => navigate('/products')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto mt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/products')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Product Image Gallery */}
            <div className="relative">
              <ImageGallery 
                images={productImages || []}
                productName={product.name}
                fallbackImage={product.image_url}
              />
              
              {/* Action Buttons Overlay */}
              <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                  className="bg-white/80 hover:bg-white/90 backdrop-blur-sm"
                onClick={handleWishlistToggle}
                disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
              >
                <Heart 
                  className={`w-5 h-5 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
              </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-white/80 hover:bg-white/90 backdrop-blur-sm"
                  onClick={() => {
                    // Share functionality
                    if (navigator.share) {
                      navigator.share({
                        title: product.name,
                        text: `Check out this product: ${product.name}`,
                        url: window.location.href,
                      });
                    } else {
                      // Fallback: copy to clipboard
                      navigator.clipboard.writeText(window.location.href);
                      toast({
                        title: "Link copied!",
                        description: "Product link has been copied to clipboard.",
                      });
                    }
                  }}
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </Button>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className="text-lg text-pink-600">by {getVendorName()}</p>
                {productCategories && productCategories.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {productCategories.slice(0, 3).map((category: string) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="text-sm px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        {category}
                      </Badge>
                    ))}
                    {productCategories.length > 3 && (
                      <Badge
                        variant="secondary"
                        className="text-sm px-3 py-1 bg-gray-100 text-gray-600"
                      >
                        +{productCategories.length - 3} more
                  </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="text-4xl font-bold text-gray-800">
                ₹{product.price}
              </div>

              {/* Review Summary */}
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(ratingData.averageRating || 0)} size="sm" />
                <span className="text-sm text-gray-600">
                  {ratingData.averageRating?.toFixed(1) || '0.0'} ({ratingData.reviewCount || 0} {ratingData.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>

              {product.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>
              )}

              {product.stock_quantity !== null && (
                <div>
                  <span className="text-sm text-gray-500">
                    Stock: {product.stock_quantity} available
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {cartItem ? (
                  // Item is in cart - show quantity controls above disabled button
                  <div className="space-y-3">
                    {/* Quantity controls centered */}
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => decrementCartMutation.mutate()}
                        disabled={decrementCartMutation.isPending}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => incrementCartMutation.mutate()}
                        disabled={incrementCartMutation.isPending}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Disabled Add to Cart button */}
                    <Button
                      className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                      disabled={true}
                      size="lg"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Item already in cart
                    </Button>
                  </div>
                ) : (
                  // Item not in cart - show add to cart button
                <Button
                  onClick={() => addToCartMutation.mutate()}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                  disabled={addToCartMutation.isPending}
                  size="lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
                </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reviews Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
          
          {/* Review Summary */}
          <div className="mb-8">
            <ReviewSummary productId={product?.id || ''} />
          </div>
          
          {/* Review Form */}
          <div className="mb-8">
            <ReviewPostCreator 
              productId={product?.id || ''} 
              productName={product?.name || ''}
              onPostCreated={() => {
                // Refresh review data
                queryClient.invalidateQueries({ queryKey: ["posts"] });
              }}
            />
          </div>
          
          {/* Review List */}
          <div>
            <ReviewList 
              productId={product?.id || ''} 
              productVendorId={product?.vendor_id || ''} 
            />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ProductDetail;
