'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Package, TrendingUp, Target, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useProductRating } from "@/hooks/useProductRating";
import StarRating from "./StarRating";
import { apiClient } from "@/lib/api-client";

interface VendorProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category?: string;
    stock_quantity?: number;
    is_active?: boolean;
    created_at: string;
    group_order_enabled?: boolean;
  };
  isOwner?: boolean;
  index?: number;
  // Selection props
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (productId: string, isSelected: boolean) => void;
  // Tier information
  hasTieredDiscount?: boolean;
  maxDiscount?: number;
}

const VendorProductCard = ({ 
  product, 
  isOwner = false, 
  index,
  isSelectable = false,
  isSelected = false,
  onSelectionChange,
  hasTieredDiscount = false,
  maxDiscount = 0
}: VendorProductCardProps) => {
  const router = useRouter();

  const { data: productImages } = useQuery({
    queryKey: ["product-images", product.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${product.id}/images`);
      return data?.images || [];
    },
    enabled: !!product.id,
  });

  // Fetch product rating and review count
  const { data: ratingData } = useProductRating(product.id);

  const { data: productDetail } = useQuery({
    queryKey: ['product-detail', product.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${product.id}`);
      return data.product;
    },
    enabled: !!product.id,
  });

  const productCategories = productDetail?.categories?.map(
    (mapping: any) => mapping.category?.name
  ).filter(Boolean) as string[] | undefined;

  const handleEdit = () => {
    // In selection mode, clicking should select instead of router.push
    if (isSelectable) {
      handleSelectionChange(!isSelected);
      return;
    }
    router.push(`/products/${product.id}/edit`);
  };

  const handleViewProduct = () => {
    // In selection mode, clicking should select instead of router.push
    if (isSelectable) {
      handleSelectionChange(!isSelected);
      return;
    }
    router.push(`/products/${product.id}`);
  };

  const handleCardClick = () => {
    // Only handle selection in bulk selection mode
    if (isSelectable) {
      handleSelectionChange(!isSelected);
    }
  };

  const handleSelectionChange = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(product.id, checked);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="group relative w-full"
    >
      {/* Main Card Container */}
      <div 
        className={`relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:shadow-pink-300/50 hover:scale-[1.02] ${
          isSelected ? 'ring-4 ring-pink-500 ring-offset-4 shadow-2xl shadow-pink-500/30 scale-[1.03]' : ''
        } ${isSelectable ? 'cursor-pointer hover:ring-2 hover:ring-pink-300 hover:ring-offset-2' : ''}`}
        onClick={handleCardClick}
      >
        {/* Product Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={productImages && productImages.length > 0 
              ? productImages[0]?.image_url 
              : product.image_url || "/placeholder.svg"
            }
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 cursor-pointer"
            onClick={handleViewProduct}
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/30 to-transparent" />
          
          {/* Selection Overlay - Prominent Visual Feedback */}
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-pink-500/20 backdrop-blur-[1px] flex items-center justify-center z-20"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                className="bg-pink-500 rounded-full p-4 shadow-2xl"
              >
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>
          )}

          {/* Selection Mode Visual Indicator */}
          {isSelectable && !isSelected && (
            <div className="absolute inset-0 bg-pink-500/5 backdrop-blur-[0.5px] opacity-50" />
          )}
          
          {/* Selection Checkbox - Mobile Optimized */}
          {isSelectable && (
            <div className="absolute top-3 right-3 z-30">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleSelectionChange}
                  className="w-5 h-5 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                />
              </div>
            </div>
          )}
          
          {/* Active Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge 
              variant={product.is_active ? "default" : "secondary"}
              className={`px-3 py-1 text-sm font-semibold shadow-lg backdrop-blur-sm border-2 ${
                product.is_active 
                  ? "bg-green-500 hover:bg-green-600 text-white border-green-300" 
                  : "bg-red-500 hover:bg-red-600 text-white border-red-300"
              }`}
            >
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Tier Discount Badge */}
          {hasTieredDiscount && (
            <div className="absolute bottom-3 right-3">
              <Badge 
                className="px-2 py-1 text-xs font-semibold shadow-lg backdrop-blur-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {maxDiscount}% OFF
              </Badge>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className={`relative bg-white p-4 space-y-3 ${isSelectable ? 'select-none' : ''}`}>
          {/* Price and Stock */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">₹{product.price}</h2>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-600">Stock</div>
              <div className={`text-lg font-bold ${
                (product.stock_quantity || 0) > 10 
                  ? 'text-green-600' 
                  : (product.stock_quantity || 0) > 0 
                    ? 'text-orange-600' 
                    : 'text-red-600'
              }`}>
                {product.stock_quantity || 0}
              </div>
            </div>
          </div>

          {/* Categories Row */}
          {productCategories && productCategories.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {productCategories.slice(0, 2).map((category: string) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 flex-shrink-0"
                >
                  {category}
                </Badge>
              ))}
              {productCategories.length > 2 && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 flex-shrink-0"
                >
                  +{productCategories.length - 2} more
                </Badge>
              )}
            </div>
          )}

          {/* Product Name and Description */}
          <div className="space-y-2">
            <h3 
              className={`text-lg font-semibold text-slate-800 leading-tight line-clamp-1 cursor-pointer hover:text-pink-600 transition-colors duration-200 ${
                isSelectable ? 'select-none' : ''
              }`}
              onClick={handleViewProduct}
            >
              {product.name}
            </h3>
            <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
              {product.description || "No description available"}
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

          {/* Created Date */}
          <div className="text-xs text-slate-500">
            Created: {new Date(product.created_at).toLocaleDateString()}
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex gap-2">
              <Button
                onClick={handleViewProduct}
                variant="outline"
                className={`flex-1 h-9 border-slate-300 hover:border-slate-400 text-sm ${
                  isSelectable ? 'cursor-pointer' : ''
                }`}
              >
                <Package className="w-4 h-4 mr-1" />
                {isSelectable ? 'Select Product' : 'View Product'}
              </Button>
              {isOwner && (
                <Button
                  onClick={handleEdit}
                  className={`flex-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-medium h-9 text-sm ${
                    isSelectable ? 'cursor-pointer' : ''
                  }`}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {isSelectable ? 'Select' : 'Edit'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className={`absolute inset-0 rounded-2xl blur-xl -z-10 transition-opacity duration-500 ${
        isSelected 
          ? 'bg-gradient-to-r from-pink-500/15 to-pink-600/15 opacity-100' 
          : 'bg-gradient-to-r from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100'
      }`} />
    </motion.div>
  );
};

export default VendorProductCard; 