'use client';

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import ReviewSummary from "@/components/ReviewSummary";
import ReviewList from "@/components/ReviewList";
import { apiClient } from "@/lib/api-client";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${id}`);
      return data;
    },
  });

  const product = data?.product;

  const addToCartMutation = useMutation({
    mutationFn: async (quantity: number) => {
      await apiClient.post('/cart', { productId: id, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      toast({
        title: 'Added to cart',
        description: 'Product has been added to your cart',
      });
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/wishlist', { productId: id });
    },
    onSuccess: () => {
      toast({
        title: 'Added to wishlist',
        description: 'Product has been added to your wishlist',
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

  if (!product) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="text-center py-12">
            <p className="text-gray-600">Product not found</p>
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
              <ImageGallery images={product.images || []} productName={product.name} />
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className="text-2xl font-semibold text-pink-600 mb-4">
                  ₹{typeof product.price === 'string' ? product.price : product.price.toString()}
                </p>
                <p className="text-gray-600">{product.description}</p>
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

