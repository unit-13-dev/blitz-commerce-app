import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProductRating } from "@/hooks/useProductRating";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    category?: string;
    description?: string;
    stock_quantity?: number;
    vendor_id: string;
    vendor_profile?: {
      full_name?: string;
      email?: string;
    } | null;
    vendor_kyc?: Array<{
      display_business_name?: string;
      business_name?: string;
    }>;
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if product is in wishlist
  const { data: isInWishlist = false } = useQuery({
    queryKey: ['wishlist-status', product.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      
      if (error) {
        console.error('Wishlist check error:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user,
  });

  // Fetch product rating and review count
  const { data: ratingData } = useProductRating(product.id);

  // Wishlist mutations
  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login to add to wishlist');
      
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: product.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
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
      if (!user) throw new Error('Please login');
      
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
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
      if (!user) throw new Error('Please login to add to cart');
      
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
        
        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: 1
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      toast({ title: "Added to cart" });
    },
    onError: (error: any) => {
      console.error('Add to cart error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
    if (product.vendor_kyc && Array.isArray(product.vendor_kyc) && product.vendor_kyc.length > 0) {
      return product.vendor_kyc[0]?.display_business_name || 
             product.vendor_kyc[0]?.business_name;
    }
    return product.vendor_profile?.full_name || 'Unknown Vendor';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => navigate(`/products/${product.id}`)}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={handleWishlistToggle}
          disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
        >
          <Heart 
            className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
          />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <h3 
          className="font-semibold mb-1 cursor-pointer hover:text-pink-600"
          onClick={() => navigate(`/products/${product.id}`)}
        >
          {product.name}
        </h3>
        <p className="text-sm text-pink-600 mb-2">
          by {getVendorName()}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-gray-800">${product.price}</span>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  Math.round(ratingData?.averageRating || 0) >= star 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="text-sm text-gray-600 ml-1">
              {ratingData?.averageRating?.toFixed(1) || '0.0'} ({ratingData?.reviewCount || 0})
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={() => addToCartMutation.mutate()}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
            disabled={addToCartMutation.isPending}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
