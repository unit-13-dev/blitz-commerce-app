'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProtectedRoute } from "@/lib/auth-utils";
import CartProductCard from "@/components/CartProductCard";
import { apiClient } from "@/lib/api-client";

const Cart = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const { data: cartData, isLoading, error } = useQuery({
    queryKey: ['cart-items', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get('/cart');
      return data;
    },
    enabled: !!user?.id,
  });

  const cartItems = cartData?.items || [];

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await apiClient.put(`/cart/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiClient.delete(`/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      toast({
        title: 'Item removed',
        description: 'Item has been removed from your cart',
      });
    },
  });

  const calculateTotal = () => {
    return cartItems.reduce((sum: number, item: any) => {
      const price = typeof item.product.price === 'string' 
        ? parseFloat(item.product.price) 
        : Number(item.product.price);
      return sum + (price * item.quantity);
    }, 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(cartItems.map((item: any) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to checkout",
        variant: "destructive",
      });
      return;
    }
    router.push('/checkout');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">Shopping Cart</h1>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading cart...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">Error loading cart</p>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600 mb-4">Your cart is empty</p>
                <Button onClick={() => router.push('/products')}>
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedItems.length === cartItems.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="font-medium">Select All</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {selectedItems.length} selected
                    </span>
                  </div>

                  {cartItems.map((item: any) => (
                    <CartProductCard
                      key={item.id}
                      item={item}
                      onUpdateQuantity={(itemId: string, quantity: number) =>
                        updateQuantityMutation.mutate({ itemId: item.id, quantity })
                      }
                      onRemoveItem={(itemId: string) => removeItemMutation.mutate(itemId)}
                    />
                  ))}
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-lg shadow-md sticky top-20">
                    <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>Free</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleCheckout}
                      className="w-full"
                      disabled={selectedItems.length === 0}
                    >
                      Proceed to Checkout
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Layout>
        <Footer />
      </div>
    </ProtectedRoute>
  );
};

export default Cart;

