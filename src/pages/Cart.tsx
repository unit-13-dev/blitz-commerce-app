import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Trash2, ArrowLeft, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProductImages } from "@/lib/utils";

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch cart items
  const { data: cartItems = [], isLoading, error } = useQuery({
    queryKey: ['cart-items', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('No user ID found');
        return [];
      }
      
      console.log('Fetching cart for user:', user.id);
      
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          user_id,
          product_id,
          quantity,
          product:products!inner (
            id,
            name,
            price
          )
        `)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Cart data fetched:', data);
      
      // Filter out items with null products
      const items = data?.filter(item => item.product) || [];
      
      // Fetch product images for all items
      const productIds = items.map(item => item.product.id);
      const productImages = await getProductImages(productIds);
      
      // Add image_url to each item
      const itemsWithImages = items.map(item => ({
        ...item,
        product: {
          ...item.product,
          image_url: productImages[item.product.id] || null
        }
      }));
      
      return itemsWithImages;
    },
    enabled: !!user?.id,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', itemId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      toast({
        title: 'Item removed',
        description: 'Item has been removed from your cart',
      });
    },
    onError: (error: any) => {
      console.error('Error removing from cart:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to remove item from cart", 
        variant: "destructive" 
      });
    },
  });

  // Checkout mutation (kept as-is, with minor toast updates for consistency)
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');
      if (!shippingAddress.trim()) throw new Error('Shipping address is required');

      const totalAmount = cartItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          shipping_address: shippingAddress,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (clearError) throw clearError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      toast({
        title: 'Order placed successfully!',
        description: 'Your order has been submitted and is being processed.',
      });
      setShippingAddress('');
      setIsCheckingOut(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Checkout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(cartItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleBulkRemove = () => {
    selectedItems.forEach(id => {
      removeItemMutation.mutate(id);
    });
    setSelectedItems([]);
  };

  // Error state
  if (error) {
    return (
      <div>
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <p className="text-red-500 font-medium">Error loading cart: {error.message}</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['cart-items'] })}
              className="mt-4 bg-pink-600 hover:bg-pink-700 text-white"
            >
              Retry
            </Button>
          </div>
          </div>
        </div>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center text-gray-600 font-medium">Loading your cart...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Please sign in to view your cart</h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div>
      <Header />
      <div className="container mx-auto px-4 mt-20 py-8">
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
              <h1 className="text-3xl font-bold text-gray-800">Shopping Cart</h1>
              {cartItems.length > 0 && (
                <span className="ml-4 text-sm text-gray-500 font-medium">
                  ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-sm">
              <ShoppingCart className="w-16 h-16 text-pink-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Discover great deals and add items you love!</p>
              <Button 
                onClick={() => navigate('/products')}
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
                  <label htmlFor="select-all" className="text-sm text-gray-600">Select All</label>
                  {selectedItems.length > 0 && (
                    <div className="ml-auto flex gap-2">
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
                  {/* Regular Items */}
                  {cartItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-start border-b border-gray-200 pb-6"
                    >
                      <Checkbox 
                        id={`item-${item.id}`}
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                        className="mt-4 mr-4"
                      />
                      <div className="flex-1 flex gap-4">
                        <img 
                          src={item.product?.image_url || "/placeholder.svg"}
                          alt={item.product?.name || 'Product'}
                          className="w-24 h-24 object-cover rounded-md"
                          onClick={() => navigate(`/products/${item.product?.id}`)}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                        <div className="flex-1 flex justify-between">
                          <div>
                            <h3 
                              className="font-semibold text-gray-800 cursor-pointer hover:text-pink-600 transition-colors"
                              onClick={() => navigate(`/products/${item.product?.id}`)}
                            >
                              {item.product?.name || 'Unnamed Product'}
                            </h3>
                            <span className="text-lg font-bold text-gray-900 block mt-1">
                              ₹{item.product?.price?.toFixed(2) || '0.00'}
                            </span>
                            <p className="text-sm text-green-600 mt-1">In stock</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantityMutation.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity - 1
                                })}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantityMutation.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity + 1
                                })}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-300 hover:bg-red-50"
                              onClick={() => removeItemMutation.mutate(item.id)}
                              disabled={removeItemMutation.isPending}
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

              <div className="lg:col-span-1 max-w-xl">
                <div className="bg-white p-6 rounded-xl shadow-md sticky border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Cart Summary</h3>
                  <div className="space-y-4 mb-4 text-sm text-gray-600">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between border-b border-gray-200 pb-2">
                        <div className="flex-1">
                          <span className="block font-medium">{item.product?.name}</span>
                          <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                        </div>
                        <span className="font-bold text-gray-900">
                          ₹{(item.product?.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 font-bold text-gray-900">
                      <span>Total</span>
                      <span>₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white transition-colors rounded-md"
                    onClick={() => navigate("/checkout")}
                  >
                    Proceed to Checkout
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

export default Cart;
