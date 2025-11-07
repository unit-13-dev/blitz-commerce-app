'use client';

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProtectedRoute } from "@/lib/auth-utils";
import { apiClient } from "@/lib/api-client";
import HighlightProductCard from "@/components/HighlightProductCard";

export default function Wishlist() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlistData, isLoading } = useQuery({
    queryKey: ['wishlist-items', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get('/wishlist');
      return data;
    },
    enabled: !!user?.id,
  });

  const wishlistItems = wishlistData?.items || [];

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiClient.delete(`/wishlist/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      toast({ title: "Removed from wishlist" });
    },
  });

  return (
    <ProtectedRoute>
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

            <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading wishlist...</p>
              </div>
            ) : wishlistItems.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600 mb-4">Your wishlist is empty</p>
                <Button onClick={() => router.push('/products')}>
                  Browse Products
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {wishlistItems.map((item: any) => (
                  <HighlightProductCard
                    key={item.id}
                    product={item.product}
                    vendor={item.product.vendor_profile || { id: '', email: '', full_name: '' }}
                  />
                ))}
              </div>
            )}
          </div>
        </Layout>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

