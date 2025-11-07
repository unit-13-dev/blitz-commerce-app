'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProtectedRoute } from "@/lib/auth-utils";
import { apiClient } from "@/lib/api-client";

export default function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    addressType: "home",
    fullName: "",
    phoneNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isDefault: false,
  });

  const { data: cartData } = useQuery({
    queryKey: ['cart-items', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get('/cart');
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: addressesData } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get('/addresses');
      return data;
    },
    enabled: !!user?.id,
  });

  const cartItems = cartData?.items || [];
  const addresses = addressesData?.addresses || [];

  const createAddressMutation = useMutation({
    mutationFn: async (address: typeof newAddress) => {
      const { data } = await apiClient.post('/addresses', address);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowAddressForm(false);
      setNewAddress({
        addressType: "home",
        fullName: "",
        phoneNumber: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        isDefault: false,
      });
      toast({ title: "Address added successfully" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) throw new Error('Cart is empty');
      
      const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId);
      if (!selectedAddress) throw new Error('Please select an address');

      const addressText = `${selectedAddress.fullName}, ${selectedAddress.addressLine1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postalCode}`;

      const { data } = await apiClient.post('/orders', {
        items: cartItems,
        shippingAddressId: selectedAddress.id,
        shippingAddressText: addressText,
        paymentMethod,
        shippingAmount: 0,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      router.push(`/orders/${data.order.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Checkout failed",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
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

            <h1 className="text-3xl font-bold mb-8">Checkout</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </h2>

                  {addresses.length > 0 && (
                    <RadioGroup
                      value={selectedAddressId || ''}
                      onValueChange={setSelectedAddressId}
                      className="space-y-3 mb-4"
                    >
                      {addresses.map((address: any) => (
                        <div
                          key={address.id}
                          className="flex items-start space-x-3 p-4 border rounded-lg hover:border-pink-500 cursor-pointer"
                        >
                          <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                          <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                            <div className="font-medium">{address.fullName}</div>
                            <div className="text-sm text-gray-600">
                              {address.addressLine1}, {address.addressLine2 && `${address.addressLine2}, `}
                              {address.city}, {address.state} {address.postalCode}
                            </div>
                            <div className="text-sm text-gray-500">{address.phoneNumber}</div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {showAddressForm ? (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Full Name</Label>
                          <Input
                            value={newAddress.fullName}
                            onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Phone Number</Label>
                          <Input
                            value={newAddress.phoneNumber}
                            onChange={(e) => setNewAddress({ ...newAddress, phoneNumber: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Address Line 1</Label>
                        <Input
                          value={newAddress.addressLine1}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Address Line 2</Label>
                        <Input
                          value={newAddress.addressLine2}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>City</Label>
                          <Input
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <Input
                            value={newAddress.postalCode}
                            onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createAddressMutation.mutate(newAddress)}
                          disabled={createAddressMutation.isPending}
                        >
                          Save Address
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddressForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowAddressForm(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Address
                    </Button>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online">Online Payment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod">Cash on Delivery</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-md sticky top-20">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                  <div className="space-y-2 mb-4">
                    {cartItems.map((item: any) => {
                      const price = typeof item.product.price === 'string' 
                        ? parseFloat(item.product.price) 
                        : Number(item.product.price);
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.product.name} x {item.quantity}</span>
                          <span>₹{(price * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 flex justify-between">
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
                    onClick={() => createOrderMutation.mutate()}
                    className="w-full"
                    disabled={!selectedAddressId || createOrderMutation.isPending || cartItems.length === 0}
                  >
                    {createOrderMutation.isPending ? "Processing..." : "Place Order"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Layout>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

