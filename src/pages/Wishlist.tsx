import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, ShoppingCart, Trash2, ArrowLeft, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProductRating } from "@/hooks/useProductRating";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StarRating from "@/components/StarRating";
import { getProductImages } from "@/lib/utils";

// Component to display product rating in wishlist
const WishlistProductRating = ({ productId }: { productId?: string }) => {
  const { data: ratingData } = useProductRating(productId || '');

  if (!ratingData?.averageRating || ratingData.averageRating <= 0) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <StarRating rating={Math.round(ratingData.averageRating)} size="sm" />
      <span className="text-xs text-gray-500">
        {ratingData.averageRating.toFixed(1)} ({ratingData.reviewCount || 0} {ratingData.reviewCount === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
};

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const {
    data: wishlistItems = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("No user ID found");
        return [];
      }

      console.log("Fetching wishlist for user:", user.id);

      const { data, error } = await supabase
        .from("wishlist")
        .select(
          `
          id,
          user_id,
          product_id,
          added_at,
          products!inner (
            id,
            name,
            price
          )
        `
        )
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Wishlist data fetched:", data);

      const items = data?.filter((item) => item.products) || [];
      
      // Fetch product images for all wishlist items
      const productIds = items.map(item => item.products.id);
      const productImages = await getProductImages(productIds);
      
      // Add image_url to each item
      const itemsWithImages = items.map(item => ({
        ...item,
        products: {
          ...item.products,
          image_url: productImages[item.products.id] || null
        }
      }));
      
      return itemsWithImages;
    },
    enabled: !!user?.id,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({ title: "Removed from wishlist" });
    },
    onError: (error: any) => {
      console.error("Error removing from wishlist:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove item from wishlist",
        variant: "destructive",
      });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .single();

      if (existingItem) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast({ title: "Moved to cart" });
    },
    onError: (error: any) => {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to move item to cart",
        variant: "destructive",
      });
    },
  });

  const calculateTotal = () => {
    return wishlistItems.reduce((sum, item) => {
      const price = item.products?.price || 0;
      return sum + price;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!wishlistItems.length) return;

    try {
      for (const item of wishlistItems) {
        if (item.products?.id) {
          await addToCartMutation.mutateAsync(item.products.id);
        }
      }
      navigate("/cart");
    } catch (error) {
      console.error("Error during checkout:", error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(wishlistItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, id]);
    } else {
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const handleBulkRemove = () => {
    selectedItems.forEach((id) => {
      const item = wishlistItems.find((i) => i.id === id);
      if (item?.products?.id) {
        removeFromWishlistMutation.mutate(item.products.id);
      }
    });
    setSelectedItems([]);
  };

  const handleBulkAddToCart = () => {
    selectedItems.forEach((id) => {
      const item = wishlistItems.find((i) => i.id === id);
      if (item?.products?.id) {
        addToCartMutation.mutate(item.products.id);
      }
    });
    setSelectedItems([]);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <p className="text-red-500 font-medium">
              Error loading wishlist: {error.message}
            </p>
            <Button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["wishlist"] })
              }
              className="mt-4 bg-pink-600 hover:bg-pink-700 text-white"
            >
              Retry
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center text-gray-600 font-medium">
            Loading your wishlist...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mr-4 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2 text-gray-600" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-gray-800">My Wishlist</h1>
              {wishlistItems.length > 0 && (
                <span className="ml-4 text-sm text-gray-500 font-medium">
                  ({wishlistItems.length} item
                  {wishlistItems.length !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-sm">
              <Heart className="w-16 h-16 text-pink-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Discover great deals and add items you love!
              </p>
              <Button
                onClick={() => navigate("/products")}
                className="bg-pink-600 hover:bg-pink-700 text-white transition-colors"
              >
                Browse Products
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3">
                <div className="flex items-center mb-4">
                  <Checkbox
                    id="select-all"
                    onCheckedChange={handleSelectAll}
                    className="mr-2"
                  />
                  <label htmlFor="select-all" className="text-sm text-gray-600">
                    Select All
                  </label>
                  {selectedItems.length > 0 && (
                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkAddToCart}
                      >
                        Move Selected to Cart
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkRemove}
                        className="text-red-500 border-red-300"
                      >
                        Remove Selected
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  {wishlistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start border-b border-gray-200 pb-6"
                    >
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) =>
                          handleItemSelect(item.id, checked as boolean)
                        }
                        className="mt-4 mr-4"
                      />
                      <div className="flex-1 flex gap-4">
                        <img
                          src={
                            item.products?.image_url ||
                            "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop"
                          }
                          alt={item.products?.name || "Product"}
                          className="w-24 h-24 object-cover rounded-md"
                          onClick={() =>
                            navigate(`/products/${item.products?.id}`)
                          }
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop";
                          }}
                        />
                        <div className="flex-1">
                          <h3
                            className="font-semibold text-gray-800 cursor-pointer hover:text-pink-600 transition-colors"
                            onClick={() =>
                              navigate(`/products/${item.products?.id}`)
                            }
                          >
                            {item.products?.name || "Unnamed Product"}
                          </h3>
                          <span className="text-lg font-bold text-gray-900 block mt-1">
                            ₹{item.products?.price?.toFixed(2) || "0.00"}
                          </span>
                          
                          {/* Rating Display */}
                          <WishlistProductRating productId={item.products?.id} />
                          
                          <p className="text-sm text-green-600 mt-1">
                            In stock
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              onClick={() =>
                                addToCartMutation.mutate(item.products?.id)
                              }
                              className="bg-pink-600 hover:bg-pink-700 text-white transition-colors rounded-md text-sm"
                              disabled={addToCartMutation.isPending}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              {addToCartMutation.isPending
                                ? "Moving..."
                                : "Move to Cart"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-300 hover:bg-red-50"
                              onClick={() =>
                                removeFromWishlistMutation.mutate(
                                  item.products?.id
                                )
                              }
                              disabled={removeFromWishlistMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-md sticky top-24 border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Wishlist Summary
                  </h3>
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Items</span>
                      <span>{wishlistItems.length}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Subtotal</span>
                      <span>₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white transition-colors rounded-md"
                    disabled={
                      addToCartMutation.isPending || wishlistItems.length === 0
                    }
                  >
                    {addToCartMutation.isPending
                      ? "Processing..."
                      : "Proceed to Checkout"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Wishlist;
