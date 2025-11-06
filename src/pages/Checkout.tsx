import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Plus, Edit, Trash2, CreditCard, Truck, CheckCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProductImages } from "@/lib/utils";

type CheckoutStep = "address" | "review" | "payment";

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if this is a group order checkout
  const isGroupOrder = searchParams.get('type') === 'group';
  const groupId = searchParams.get('groupId');
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address_type: "home" as "home" | "office" | "other",
    full_name: "",
    phone_number: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: false,
  });

  // Fetch cart items or group order data
  const { data: cartItems = [], isLoading: cartLoading } = useQuery({
    queryKey: ["cart-items", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          quantity,
          products!inner (
            id,
            name,
            price
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      const items = data || [];
      
      // Fetch product images for all items
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
    enabled: !!user?.id && !isGroupOrder,
  });

  // Fetch group order data
  const { data: groupOrder, isLoading: groupLoading } = useQuery({
    queryKey: ["group-order", groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          products (
            id,
            name,
            price
          ),
          group_order_status (
            current_discount_percentage,
            paid_participants,
            total_quantity,
            total_amount
          )
        `)
        .eq("id", groupId)
        .single();

      if (error) throw error;
      
      if (data?.products) {
        // Fetch product image for group order
        const productImages = await getProductImages([data.products.id]);
        data.products.image_url = productImages[data.products.id] || null;
      }
      
      return data;
    },
    enabled: !!groupId && isGroupOrder,
  });

  // Determine which data to use
  const checkoutItems = isGroupOrder ? (groupOrder ? [{
    id: groupOrder.id,
    quantity: 1, // Individual participants always pay for 1 item
    products: groupOrder.products
  }] : []) : cartItems;
  
  const isLoading = isGroupOrder ? groupLoading : cartLoading;
  
  // Debug: Log group order data
  if (isGroupOrder && groupOrder) {
    console.log('Group Order Data:', {
      id: groupOrder.id,
      order_number: groupOrder.order_number,
      creator_id: groupOrder.creator_id,
      group_order_status: groupOrder.group_order_status
    });
  }

  // Fetch user addresses
  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ["user-addresses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Add address mutation
  const addAddressMutation = useMutation({
    mutationFn: async (addressData: typeof addressForm) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_addresses")
        .insert({
          ...addressData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchAddresses();
      setShowAddAddress(false);
      setAddressForm({
        address_type: "home",
        full_name: "",
        phone_number: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
        is_default: false,
      });
      toast({ title: "Address added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add address",
        variant: "destructive",
      });
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!selectedAddressId) throw new Error("Please select a shipping address");

      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
      if (!selectedAddress) throw new Error("Selected address not found");

      if (isGroupOrder && groupId) {
        // Check if this is admin finalizing or participant paying
        const isAdmin = groupOrder?.creator_id === user.id;
        
        if (isAdmin) {
          // Handle group order finalization (admin)
          const { data, error } = await supabase.rpc('finalize_group_order', {
            group_uuid: groupId
          });
          
          if (error) throw error;
          
          // Debug: Log the raw response
          console.log('Raw RPC response:', { data, error });
          
          return data;
        } else {
          // Handle individual participant payment
          console.log('Making individual participant payment with:', {
            group_uuid: groupId,
            user_uuid: user.id,
            quantity: checkoutItems[0]?.quantity || 1,
            shipping_address_id: selectedAddressId,
            shipping_address_text: `${selectedAddress.full_name}, ${selectedAddress.address_line1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`
          });
          
          const { data, error } = await supabase.rpc('create_individual_participant_payment', {
            group_uuid: groupId,
            user_uuid: user.id,
            quantity: checkoutItems[0]?.quantity || 1,
            shipping_address_id: selectedAddressId,
            shipping_address_text: `${selectedAddress.full_name}, ${selectedAddress.address_line1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`
          });
          
          if (error) throw error;
          
          // Debug: Log the raw response
          console.log('Raw individual payment RPC response:', { data, error });
          
          return data;
        }
      } else {
        // Handle regular cart order
        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
        const shipping = 50; // Fixed shipping cost for now
        const total = subtotal + shipping;

        // Generate order number
        const { data: orderNumber } = await supabase.rpc('generate_order_number');
        if (!orderNumber) throw new Error("Failed to generate order number");

        // Create order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            order_number: orderNumber,
            total_amount: total,
            shipping_amount: shipping,
            shipping_address_id: selectedAddressId,
            shipping_address_text: `${selectedAddress.full_name}, ${selectedAddress.address_line1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`,
            payment_method: "razorpay",
            payment_status: "paid", // For testing purposes
            status: "paid", // For testing purposes
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.products.id,
          product_name: item.products.name,
          product_image_url: item.products.image_url,
          quantity: item.quantity,
          unit_price: item.products.price,
          total_price: item.products.price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Clear cart
        const { error: clearCartError } = await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id);

        if (clearCartError) throw clearCartError;

        return order;
      }
    },
    onSuccess: (result) => {
      if (isGroupOrder) {
        // Invalidate the correct query key used by GroupDetail page
        queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        
        // Check if this was admin finalizing or participant paying
        const isAdmin = groupOrder?.creator_id === user.id;
        
        if (isAdmin) {
          // Debug: Log the result to see its structure
          console.log('Finalize group order result:', result);
          
          // The RPC function returns a JSON object, so we need to access the data property
          const orderNumber = result?.order_number || result?.data?.order_number || groupOrder?.order_number;
          const participantCount = result?.participant_count || result?.data?.participant_count || 0;
          
          toast({ 
            title: "Group Order Finalized!", 
            description: `Order #${orderNumber} has been placed with ${participantCount} participants.`
          });
          navigate(`/groups/${groupId}`);
        } else {
          // Debug: Log the result to see its structure
          console.log('Individual payment result:', result);
          
          const orderNumber = result?.order_number || result?.data?.order_number || groupOrder?.order_number;
          
          toast({ 
            title: "Payment Successful!", 
            description: `Your payment has been processed. You can track the group order progress.`
          });
          navigate(`/groups/${groupId}`);
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["cart-items"] });
        queryClient.invalidateQueries({ queryKey: ["cart-count"] });
        toast({ title: "Order placed successfully!" });
        navigate(`/orders/${result.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  const calculateSubtotal = () => {
    if (isGroupOrder && groupOrder) {
      // For group orders, calculate individual participant price
      const isAdmin = groupOrder.creator_id === user?.id;
      if (isAdmin) {
        // Admin sees the total group amount
        return groupOrder.group_order_status?.total_amount || 0;
      } else {
        // Individual participant sees their own price
        const quantity = checkoutItems[0]?.quantity || 1;
        const productPrice = groupOrder.products?.price || 0;
        const discount = groupOrder.group_order_status?.current_discount_percentage || 0;
        const discountedPrice = productPrice * (1 - discount / 100);
        const finalPrice = discountedPrice * quantity;
        
        // Debug: Log the price calculation
        console.log('Price calculation:', {
          quantity,
          productPrice,
          discount,
          discountedPrice,
          finalPrice
        });
        
        return finalPrice;
      }
    }
    return cartItems.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
  };

  const calculateShipping = () => 50; // Fixed shipping cost
  const calculateTotal = () => calculateSubtotal() + calculateShipping();

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAddressMutation.mutate(addressForm);
  };

  const handleProceedToReview = () => {
    if (!selectedAddressId) {
      toast({
        title: "Address Required",
        description: "Please select a shipping address",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep("review");
  };

  const handleProceedToPayment = () => {
    setCurrentStep("payment");
  };

  const handlePlaceOrder = () => {
    createOrderMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to checkout</h2>
            <Button onClick={() => navigate("/auth")}>Login</Button>
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
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h2>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isGroupOrder && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
            <Button onClick={() => navigate("/products")}>Continue Shopping</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isGroupOrder && !groupOrder) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Group Order Not Found</h2>
            <p className="text-gray-600 mb-4">The group order you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => navigate("/groups")}>Back to Groups</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mr-4 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-800">
                {isGroupOrder ? "Group Order Checkout" : "Checkout"}
              </h1>
              {isGroupOrder && groupOrder && (
                <Badge variant="outline" className="border-pink-200 text-pink-600">
                  <Users className="w-3 h-3 mr-1" />
                  Group Order
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${currentStep === "address" ? "text-pink-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "address" ? "border-pink-600 bg-pink-600 text-white" : "border-gray-300"
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium">Address</span>
              </div>
              <div className={`w-16 h-0.5 ${currentStep === "review" || currentStep === "payment" ? "bg-pink-600" : "bg-gray-300"}`} />
              <div className={`flex items-center ${currentStep === "review" ? "text-pink-600" : currentStep === "payment" ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "review" ? "border-pink-600 bg-pink-600 text-white" : 
                  currentStep === "payment" ? "border-green-600 bg-green-600 text-white" :
                  "border-gray-300"
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium">Review</span>
              </div>
              <div className={`w-16 h-0.5 ${currentStep === "payment" ? "bg-green-600" : "bg-gray-300"}`} />
              <div className={`flex items-center ${currentStep === "payment" ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep === "payment" ? "border-green-600 bg-green-600 text-white" : "border-gray-300"
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium">Payment</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {currentStep === "address" && (
                <AddressStep
                  addresses={addresses}
                  selectedAddressId={selectedAddressId}
                  onAddressSelect={setSelectedAddressId}
                  showAddAddress={showAddAddress}
                  setShowAddAddress={setShowAddAddress}
                  addressForm={addressForm}
                  setAddressForm={setAddressForm}
                  onSubmit={handleAddressSubmit}
                  addAddressMutation={addAddressMutation}
                  onProceed={handleProceedToReview}
                />
              )}

              {currentStep === "review" && (
                <ReviewStep
                  cartItems={checkoutItems}
                  selectedAddress={addresses.find(addr => addr.id === selectedAddressId)}
                  onBack={() => setCurrentStep("address")}
                  onProceed={handleProceedToPayment}
                  isGroupOrder={isGroupOrder}
                  groupOrder={groupOrder}
                />
              )}

              {currentStep === "payment" && (
                <PaymentStep
                  cartItems={checkoutItems}
                  selectedAddress={addresses.find(addr => addr.id === selectedAddressId)}
                  subtotal={calculateSubtotal()}
                  shipping={calculateShipping()}
                  total={calculateTotal()}
                  onBack={() => setCurrentStep("review")}
                  onPlaceOrder={handlePlaceOrder}
                  createOrderMutation={createOrderMutation}
                  isGroupOrder={isGroupOrder}
                  groupOrder={groupOrder}
                  user={user}
                />
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <OrderSummary
                cartItems={checkoutItems}
                subtotal={calculateSubtotal()}
                shipping={calculateShipping()}
                total={calculateTotal()}
                isGroupOrder={isGroupOrder}
                groupOrder={groupOrder}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

// Address Step Component
const AddressStep = ({
  addresses,
  selectedAddressId,
  onAddressSelect,
  showAddAddress,
  setShowAddAddress,
  addressForm,
  setAddressForm,
  onSubmit,
  addAddressMutation,
  onProceed,
}: {
  addresses: any[];
  selectedAddressId: string | null;
  onAddressSelect: (id: string) => void;
  showAddAddress: boolean;
  setShowAddAddress: (show: boolean) => void;
  addressForm: any;
  setAddressForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  addAddressMutation: any;
  onProceed: () => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <MapPin className="w-5 h-5 mr-2" />
        Shipping Address
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Saved Addresses */}
      {addresses.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Saved Addresses</h3>
          <RadioGroup value={selectedAddressId || ""} onValueChange={onAddressSelect}>
            {addresses.map((address) => (
              <div key={address.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:border-pink-300 transition-colors">
                <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{address.full_name}</p>
                      <p className="text-sm text-gray-600">{address.phone_number}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {address.address_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.postal_code}
                  </p>
                  {address.is_default && (
                    <Badge className="mt-2 text-xs">Default</Badge>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Add New Address */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Add New Address</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddAddress(!showAddAddress)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showAddAddress ? "Cancel" : "Add Address"}
          </Button>
        </div>

        {showAddAddress && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_type">Address Type</Label>
                <Select
                  value={addressForm.address_type}
                  onValueChange={(value: "home" | "office" | "other") =>
                    setAddressForm({ ...addressForm, address_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={addressForm.full_name}
                  onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={addressForm.phone_number}
                onChange={(e) => setAddressForm({ ...addressForm, phone_number: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={addressForm.address_line1}
                onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line2"
                value={addressForm.address_line2}
                onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={addressForm.postal_code}
                  onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={addressForm.is_default}
                onCheckedChange={(checked) =>
                  setAddressForm({ ...addressForm, is_default: checked as boolean })
                }
              />
              <Label htmlFor="is_default">Set as default address</Label>
            </div>

            <Button
              type="submit"
              disabled={addAddressMutation.isPending}
              className="w-full"
            >
              {addAddressMutation.isPending ? "Adding..." : "Add Address"}
            </Button>
          </form>
        )}
      </div>

      {/* Proceed Button */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={onProceed}
          disabled={!selectedAddressId}
          className="bg-pink-600 hover:bg-pink-700"
        >
          Continue to Review
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Review Step Component
const ReviewStep = ({
  cartItems,
  selectedAddress,
  onBack,
  onProceed,
  isGroupOrder,
  groupOrder,
}: {
  cartItems: any[];
  selectedAddress: any;
  onBack: () => void;
  onProceed: () => void;
  isGroupOrder?: boolean;
  groupOrder?: any;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <CheckCircle className="w-5 h-5 mr-2" />
        Review Order
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Shipping Address */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Shipping Address</h3>
        <div className="p-4 border rounded-lg bg-gray-50">
          <p className="font-medium text-gray-800">{selectedAddress?.full_name}</p>
          <p className="text-sm text-gray-600">{selectedAddress?.phone_number}</p>
          <p className="text-sm text-gray-600">
            {selectedAddress?.address_line1}
            {selectedAddress?.address_line2 && `, ${selectedAddress.address_line2}`}
          </p>
          <p className="text-sm text-gray-600">
            {selectedAddress?.city}, {selectedAddress?.state} {selectedAddress?.postal_code}
          </p>
        </div>
      </div>

      {/* Group Order Info */}
      {isGroupOrder && groupOrder && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Group Order Details
          </h3>
          <div className="p-4 border rounded-lg bg-pink-50 border-pink-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Group Name:</p>
                <p className="font-medium text-gray-800">{groupOrder.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Participants:</p>
                <p className="font-medium text-gray-800">{groupOrder.group_order_status?.paid_participants || 0} paid</p>
              </div>
              <div>
                <p className="text-gray-600">Total Quantity:</p>
                <p className="font-medium text-gray-800">{groupOrder.group_order_status?.total_quantity || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">Discount Applied:</p>
                <p className="font-medium text-green-600">{groupOrder.group_order_status?.current_discount_percentage || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Order Items</h3>
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
              <img
                src={item.products.image_url || "/placeholder.svg"}
                alt={item.products.name}
                className="w-16 h-16 object-cover rounded-md"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">{item.products.name}</h4>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                {isGroupOrder && groupOrder?.group_order_status?.current_discount_percentage > 0 && (
                  <p className="text-sm text-green-600">
                    Group discount: {groupOrder.group_order_status.current_discount_percentage}% off
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-800">₹{(item.products.price * item.quantity).toFixed(2)}</p>
                <p className="text-sm text-gray-600">₹{item.products.price.toFixed(2)} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to Address
        </Button>
        <Button onClick={onProceed} className="bg-pink-600 hover:bg-pink-700">
          Continue to Payment
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Payment Step Component
const PaymentStep = ({
  cartItems,
  selectedAddress,
  subtotal,
  shipping,
  total,
  onBack,
  onPlaceOrder,
  createOrderMutation,
  isGroupOrder,
  groupOrder,
  user,
}: {
  cartItems: any[];
  selectedAddress: any;
  subtotal: number;
  shipping: number;
  total: number;
  onBack: () => void;
  onPlaceOrder: () => void;
  createOrderMutation: any;
  isGroupOrder?: boolean;
  groupOrder?: any;
  user?: any;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <CreditCard className="w-5 h-5 mr-2" />
        Payment
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Payment Method */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Payment Method</h3>
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-pink-600" />
            <div>
              <p className="font-medium text-gray-800">Razorpay</p>
              <p className="text-sm text-gray-600">Secure payment gateway</p>
            </div>
          </div>
        </div>
      </div>

      {/* Group Order Payment Info */}
      {isGroupOrder && groupOrder && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {groupOrder.creator_id === user?.id ? "Group Order Finalization" : "Individual Payment"}
          </h3>
          <div className="p-4 border rounded-lg bg-pink-50 border-pink-200">
            {groupOrder.creator_id === user?.id ? (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  You are finalizing the group order for all participants. This will:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                  <li>• Create a master order with all participant addresses</li>
                  <li>• Apply the group discount to the total amount</li>
                  <li>• Send the order to the vendor</li>
                </ul>
                <div className="text-sm">
                  <p className="text-gray-600">Group Order #: <span className="font-medium font-mono">{groupOrder.order_number}</span></p>
                  <p className="text-gray-600">Total participants: <span className="font-medium">{groupOrder.group_order_status?.paid_participants || 0}</span></p>
                  <p className="text-gray-600">Group discount: <span className="font-medium text-green-600">{groupOrder.group_order_status?.current_discount_percentage || 0}%</span></p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  You are making an individual payment for this group order. This will:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                  <li>• Create your individual order with order number</li>
                  <li>• Apply the current group discount to your payment</li>
                  <li>• Update the group order status</li>
                </ul>
                <div className="text-sm">
                  <p className="text-gray-600">Your quantity: <span className="font-medium">{cartItems[0]?.quantity || 1}</span></p>
                  <p className="text-gray-600">Group discount: <span className="font-medium text-green-600">{groupOrder.group_order_status?.current_discount_percentage || 0}%</span></p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal ({cartItems.length} items)</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>₹{shipping.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to Review
        </Button>
        <Button
          onClick={onPlaceOrder}
          disabled={createOrderMutation.isPending}
          className={isGroupOrder ? "bg-pink-600 hover:bg-pink-700" : "bg-green-600 hover:bg-green-700"}
        >
          {createOrderMutation.isPending ? "Processing..." : 
           isGroupOrder && groupOrder?.creator_id === user?.id ? "Finalize Group Order" : 
           isGroupOrder ? "Pay Now" : "Pay Now"}
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Order Summary Component
const OrderSummary = ({
  cartItems,
  subtotal,
  shipping,
  total,
  isGroupOrder,
  groupOrder,
}: {
  cartItems: any[];
  subtotal: number;
  shipping: number;
  total: number;
  isGroupOrder?: boolean;
  groupOrder?: any;
}) => (
  <Card className="sticky top-24">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {isGroupOrder && <Users className="w-4 h-4" />}
        {isGroupOrder ? "Group Order Summary" : "Order Summary"}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Group Order Info */}
      {isGroupOrder && groupOrder && (
        <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
          <div className="text-sm space-y-1">
            <p className="font-medium text-gray-800">{groupOrder.name}</p>
            <p className="text-gray-600">
              {groupOrder.group_order_status?.paid_participants || 0} participants
            </p>
            <p className="text-green-600 font-medium">
              {groupOrder.group_order_status?.current_discount_percentage || 0}% group discount
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-center space-x-3">
            <img
              src={item.products.image_url || "/placeholder.svg"}
              alt={item.products.name}
              className="w-12 h-12 object-cover rounded-md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.products.name}</p>
              <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
              {isGroupOrder && groupOrder?.group_order_status?.current_discount_percentage > 0 && (
                <p className="text-xs text-green-600">
                  {groupOrder.group_order_status.current_discount_percentage}% off
                </p>
              )}
            </div>
            <p className="text-sm font-medium text-gray-800">₹{(item.products.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal ({cartItems.length} items)</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>₹{shipping.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Checkout; 