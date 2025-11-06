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
import { motion } from "framer-motion";
import StarRating from "@/components/StarRating";

interface HighlightProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    category?: string;
    description?: string;
  };
  vendor: {
    id: string;
    full_name?: string;
    email: string;
  };
  index?: number;
}

const HighlightProductCard = ({ product, vendor, index }: HighlightProductCardProps) => {
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

  // Fetch product categories
  const { data: productCategories = [] } = useQuery({
    queryKey: ['product-categories', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_category_mappings')
        .select(`
          product_categories!inner(name)
        `)
        .eq('product_id', product.id);

      if (error) throw error;
      return data?.map((item: any) => item.product_categories.name) || [];
    },
  });

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
    return vendor.full_name || vendor.email.split('@')[0];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: (index || 0) * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.2 }
      }}
      className="group relative"
    >
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
        <div className="relative">
          <img 
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-64 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
            onClick={() => navigate(`/products/${product.id}`)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 bg-white/90 hover:bg-white shadow-sm"
            onClick={handleWishlistToggle}
            disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
          >
            <Heart 
              className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
            />
          </Button>
        </div>
        
        <CardContent className="p-6">
          {/* Product Categories */}
          {productCategories.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {productCategories.slice(0, 2).map((category: string) => (
                <span key={category} className="text-xs text-slate-500 uppercase tracking-wide font-medium bg-slate-100 px-2 py-1 rounded-md flex-shrink-0">
                  {category}
                </span>
              ))}
              {productCategories.length > 2 && (
                <span className="text-xs text-slate-500 uppercase tracking-wide font-medium bg-gray-100 px-2 py-1 rounded-md flex-shrink-0">
                  +{productCategories.length - 2} more
                </span>
              )}
            </div>
          )}

          {/* Product Title and Description */}
          <div className="space-y-1">
            <h3 
              className="text-base font-semibold text-slate-800 leading-tight line-clamp-1 cursor-pointer hover:text-pink-600 transition-colors duration-200"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              {product.name}
            </h3>
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {product.description || "Quality product"}
            </p>
            
            {/* Rating Display */}
            <div className="flex items-center gap-2 pt-1">
              <StarRating rating={Math.round(ratingData?.averageRating || 0)} size="sm" />
              <span className="text-xs text-slate-500">
                {ratingData?.averageRating && ratingData.averageRating > 0 
                  ? `${ratingData.averageRating.toFixed(1)} (${ratingData.reviewCount || 0} ${ratingData.reviewCount === 1 ? 'review' : 'reviews'})`
                  : `(0)`
                }
              </span>
            </div>
          </div>

          {/* Vendor Info */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-500">
                Sold by{" "}
                <span 
                  className="text-pink-600 font-medium cursor-pointer hover:text-pink-700 transition-colors duration-200"
                  onClick={() => navigate(`/users/${vendor.id}`)}
                >
                  {getVendorName()}
                </span>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/products/${product.id}`)}
                variant="outline"
                className="h-9 border-slate-300 hover:border-slate-400 text-sm w-full"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add to Cart
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
};

export default HighlightProductCard;
 