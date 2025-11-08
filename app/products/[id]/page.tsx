'use client';

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, ArrowLeft, RotateCcw, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import ReviewSummary from "@/components/ReviewSummary";
import ReviewList from "@/components/ReviewList";
import { apiClient } from "@/lib/api-client";

export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      const response = await apiClient.get(`/products/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Extract product from nested response: response.data.data.product
  const rawProduct = data?.data?.product;
  
  // Transform product data to match component expectations
  const product = rawProduct ? {
    ...rawProduct,
    // Transform images array to match ImageGallery component expectations
    images: rawProduct.images && Array.isArray(rawProduct.images) && rawProduct.images.length > 0
      ? rawProduct.images.map((img: any) => ({
          id: img.id,
          image_url: img.imageUrl || img.image_url || '',
          display_order: img.displayOrder ?? img.display_order ?? 0,
          is_primary: img.isPrimary ?? img.is_primary ?? false,
        }))
      : (rawProduct.imageUrl ? [{
          image_url: rawProduct.imageUrl,
          is_primary: true,
          display_order: 0,
        }] : []),
    // Ensure price is properly formatted (Prisma Decimal serializes as string)
    price: rawProduct.price 
      ? (typeof rawProduct.price === 'string' 
          ? rawProduct.price 
          : (typeof rawProduct.price === 'number' 
              ? rawProduct.price.toFixed(2) 
              : String(rawProduct.price)))
      : '0.00',
  } : null;

  const addToCartMutation = useMutation({
    mutationFn: async (quantity: number) => {
      if (!user) {
        throw new Error('Please log in to add items to cart');
      }
      const response = await apiClient.post('/cart', { productId: id, quantity });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      toast({
        title: 'Added to cart',
        description: 'Product has been added to your cart',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'Failed to add product to cart',
        variant: 'destructive',
      });
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Please log in to add items to wishlist');
      }
      const response = await apiClient.post('/wishlist', { productId: id });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Added to wishlist',
        description: 'Product has been added to your wishlist',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'Failed to add product to wishlist',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          </div>
        </Layout>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="text-center py-12">
            <p className="text-red-600">Error loading product: {error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mt-4"
            >
              Go Back
            </Button>
          </div>
        </Layout>
      </div>
    );
  }

  if (!isLoading && !product) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="text-center py-12">
            <p className="text-gray-600">Product not found</p>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mt-4"
            >
              Go Back
            </Button>
          </div>
        </Layout>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <ImageGallery 
                images={product.images || []} 
                productName={product.name || 'Product'}
                fallbackImage={product.imageUrl}
              />
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name || 'Unnamed Product'}</h1>
                <p className="text-2xl font-semibold text-pink-600 mb-4">
                  ₹{product.price || '0'}
                </p>
                
                {/* Return & Replacement Policy - Highlighted */}
                {(product.isReturnable || product.isReplaceable) && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Return & Replacement Policy
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {product.isReturnable && (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Returnable
                        </Badge>
                      )}
                      {product.isReplaceable && (
                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Replaceable
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-green-800 mt-2">
                      {product.isReturnable && product.isReplaceable
                        ? 'This product can be returned for a refund or replaced if defective.'
                        : product.isReturnable
                        ? 'This product can be returned for a refund or exchange.'
                        : 'This product can be replaced if defective or damaged.'}
                    </p>
                  </div>
                )}

                {product.description && (
                  <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
                )}
                {product.stockQuantity !== undefined && (
                  <p className="text-sm text-gray-500 mt-2">
                    Stock: {product.stockQuantity} {product.stockQuantity === 1 ? 'item' : 'items'}
                  </p>
                )}
                {product.vendor && (
                  <p className="text-sm text-gray-500 mt-1">
                    Sold by: {product.vendor.fullName || product.vendor.email || 'Unknown Vendor'}
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => addToCartMutation.mutate(1)}
                  className="flex-1"
                  disabled={!user}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  onClick={() => addToWishlistMutation.mutate()}
                  disabled={!user}
                >
                  <Heart className="w-4 h-4" />
                </Button>
              </div>

              <ReviewSummary productId={id} />
              <ReviewList productId={id} productVendorId={product.vendorId || ''} />
            </div>
          </div>
        </div>
      </Layout>
      <Footer />
    </div>
  );
}

