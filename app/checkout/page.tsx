'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Plus, Edit, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api-client";

export default function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormErrors, setAddressFormErrors] = useState<Record<string, string>>({});
  const [newAddress, setNewAddress] = useState({
    addressType: "home" as "home" | "office" | "other",
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

  // Fetch cart items
  const { data: cartData, isLoading: cartLoading, error: cartError } = useQuery({
    queryKey: ['cart-items', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/cart');
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Fetch addresses
  const { data: addressesData, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/addresses');
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Extract data from API responses
  const cartItems = cartData?.data?.items || [];
  const addresses = addressesData?.data?.addresses || [];

  // Auto-select default address or first address on load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((a: any) => a.isDefault);
      setSelectedAddressId(defaultAddress?.id || addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  // Auto-select default address on load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((a: any) => a.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else {
        // Select first address if no default
        setSelectedAddressId(addresses[0].id);
      }
    }
  }, [addresses, selectedAddressId]);

  // Validate address form
  const validateAddressForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!newAddress.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!newAddress.phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(newAddress.phoneNumber.replace(/\D/g, ''))) {
      errors.phoneNumber = "Please enter a valid 10-digit phone number";
    }
    if (!newAddress.addressLine1.trim()) {
      errors.addressLine1 = "Address line 1 is required";
    }
    if (!newAddress.city.trim()) {
      errors.city = "City is required";
    }
    if (!newAddress.state.trim()) {
      errors.state = "State is required";
    }
    if (!newAddress.postalCode.trim()) {
      errors.postalCode = "Postal code is required";
    } else if (!/^[0-9]{6}$/.test(newAddress.postalCode)) {
      errors.postalCode = "Please enter a valid 6-digit postal code";
    }

    setAddressFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (address: typeof newAddress) => {
      const response = await apiClient.post('/addresses', address);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      const newAddressId = data.data?.address?.id;
      if (newAddressId) {
        setSelectedAddressId(newAddressId);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      resetAddressForm();
      toast({ 
        title: "Address added successfully",
        description: newAddress.isDefault ? "This address has been set as default" : "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to create address",
        variant: "destructive",
      });
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, address }: { id: string; address: typeof newAddress }) => {
      const response = await apiClient.put(`/addresses/${id}`, address);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowAddressForm(false);
      setEditingAddressId(null);
      resetAddressForm();
      toast({ title: "Address updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to update address",
        variant: "destructive",
      });
    },
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/addresses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      if (selectedAddressId === editingAddressId) {
        setSelectedAddressId(null);
      }
      toast({ title: "Address deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to delete address",
        variant: "destructive",
      });
    },
  });

  // Reset address form
  const resetAddressForm = () => {
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
    setAddressFormErrors({});
  };

  // Handle edit address
  const handleEditAddress = (address: any) => {
    setEditingAddressId(address.id);
    setNewAddress({
      addressType: address.addressType,
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setShowAddressForm(true);
  };

  // Handle save address
  const handleSaveAddress = () => {
    if (!validateAddressForm()) {
      return;
    }

    if (editingAddressId) {
      updateAddressMutation.mutate({ id: editingAddressId, address: newAddress });
    } else {
      createAddressMutation.mutate(newAddress);
    }
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }
      
      const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId);
      if (!selectedAddress) {
        throw new Error('Please select an address');
      }

      const addressText = `${selectedAddress.fullName}, ${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ', ' + selectedAddress.addressLine2 : ''}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postalCode}`;

      const response = await apiClient.post('/orders', {
        shippingAddressId: selectedAddress.id,
        shippingAddressText: addressText,
        paymentMethod,
        shippingAmount: 0,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      const orderId = data.data?.order?.id;
      if (orderId) {
        router.push(`/orders/${orderId}`);
      } else {
        toast({
          title: "Order created",
          description: "Your order has been placed successfully",
        });
        router.push('/orders');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout failed",
        description: error?.response?.data?.message || error?.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  // Calculate total
  const calculateTotal = () => {
    return cartItems.reduce((sum: number, item: any) => {
      const price = typeof item.product?.price === 'string' 
        ? parseFloat(item.product.price) 
        : Number(item.product?.price || 0);
      return sum + (price * (item.quantity || 1));
    }, 0);
  };

  // Redirect if not logged in
  if (!user) {
    router.push('/auth');
    return null;
  }

  // Loading state
  if (cartLoading || addressesLoading) {
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

  // Empty cart state
  if (cartError || cartItems.length === 0) {
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
            <div className="text-center py-12">
              <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some products to your cart to continue</p>
              <Button onClick={() => router.push('/products')}>
                Browse Products
              </Button>
            </div>
          </div>
        </Layout>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (cartLoading || addressesLoading) {
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

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Your cart is empty</p>
              <Button onClick={() => router.push('/products')}>
                Continue Shopping
              </Button>
            </div>
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

            <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address Section */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h2>

                {addresses.length > 0 && !showAddressForm && (
                  <RadioGroup
                    value={selectedAddressId || ''}
                    onValueChange={setSelectedAddressId}
                    className="space-y-3 mb-4"
                  >
                    {addresses.map((address: any) => (
                      <div
                        key={address.id}
                        className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddressId === address.id
                            ? 'border-pink-500 bg-pink-50'
                            : 'hover:border-pink-300'
                        }`}
                      >
                        <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                        <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{address.fullName}</span>
                                {address.isDefault && (
                                  <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 capitalize">
                                  ({address.addressType})
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {address.addressLine1}
                                {address.addressLine2 && `, ${address.addressLine2}`}
                                <br />
                                {address.city}, {address.state} {address.postalCode}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">{address.phoneNumber}</div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAddress(address);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this address?')) {
                                    deleteAddressMutation.mutate(address.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {showAddressForm ? (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">
                        {editingAddressId ? 'Edit Address' : 'Add New Address'}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                          resetAddressForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="addressType">Address Type *</Label>
                        <Select
                          value={newAddress.addressType}
                          onValueChange={(value: "home" | "office" | "other") =>
                            setNewAddress({ ...newAddress, addressType: value })
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
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={newAddress.fullName}
                          onChange={(e) => {
                            setNewAddress({ ...newAddress, fullName: e.target.value });
                            if (addressFormErrors.fullName) {
                              setAddressFormErrors({ ...addressFormErrors, fullName: '' });
                            }
                          }}
                          className={addressFormErrors.fullName ? 'border-red-500' : ''}
                        />
                        {addressFormErrors.fullName && (
                          <p className="text-sm text-red-500 mt-1">{addressFormErrors.fullName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        value={newAddress.phoneNumber}
                        onChange={(e) => {
                          setNewAddress({ ...newAddress, phoneNumber: e.target.value });
                          if (addressFormErrors.phoneNumber) {
                            setAddressFormErrors({ ...addressFormErrors, phoneNumber: '' });
                          }
                        }}
                        className={addressFormErrors.phoneNumber ? 'border-red-500' : ''}
                        placeholder="10-digit phone number"
                      />
                      {addressFormErrors.phoneNumber && (
                        <p className="text-sm text-red-500 mt-1">{addressFormErrors.phoneNumber}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={newAddress.addressLine1}
                        onChange={(e) => {
                          setNewAddress({ ...newAddress, addressLine1: e.target.value });
                          if (addressFormErrors.addressLine1) {
                            setAddressFormErrors({ ...addressFormErrors, addressLine1: '' });
                          }
                        }}
                        className={addressFormErrors.addressLine1 ? 'border-red-500' : ''}
                      />
                      {addressFormErrors.addressLine1 && (
                        <p className="text-sm text-red-500 mt-1">{addressFormErrors.addressLine1}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        value={newAddress.addressLine2}
                        onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={newAddress.city}
                          onChange={(e) => {
                            setNewAddress({ ...newAddress, city: e.target.value });
                            if (addressFormErrors.city) {
                              setAddressFormErrors({ ...addressFormErrors, city: '' });
                            }
                          }}
                          className={addressFormErrors.city ? 'border-red-500' : ''}
                        />
                        {addressFormErrors.city && (
                          <p className="text-sm text-red-500 mt-1">{addressFormErrors.city}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={newAddress.state}
                          onChange={(e) => {
                            setNewAddress({ ...newAddress, state: e.target.value });
                            if (addressFormErrors.state) {
                              setAddressFormErrors({ ...addressFormErrors, state: '' });
                            }
                          }}
                          className={addressFormErrors.state ? 'border-red-500' : ''}
                        />
                        {addressFormErrors.state && (
                          <p className="text-sm text-red-500 mt-1">{addressFormErrors.state}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          value={newAddress.postalCode}
                          onChange={(e) => {
                            setNewAddress({ ...newAddress, postalCode: e.target.value });
                            if (addressFormErrors.postalCode) {
                              setAddressFormErrors({ ...addressFormErrors, postalCode: '' });
                            }
                          }}
                          className={addressFormErrors.postalCode ? 'border-red-500' : ''}
                          placeholder="6-digit code"
                          maxLength={6}
                        />
                        {addressFormErrors.postalCode && (
                          <p className="text-sm text-red-500 mt-1">{addressFormErrors.postalCode}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={newAddress.isDefault}
                        onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isDefault" className="cursor-pointer">
                        Set as default address
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveAddress}
                        disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                      >
                        {editingAddressId ? 'Update Address' : 'Save Address'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                          resetAddressForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddressForm(true);
                      setEditingAddressId(null);
                      resetAddressForm();
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Address
                  </Button>
                )}
              </div>

              {/* Payment Method Section */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="cursor-pointer">Online Payment</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="cursor-pointer">Cash on Delivery</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-md sticky top-20">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                <div className="space-y-2 mb-4">
                  {cartItems.map((item: any) => {
                    const price = typeof item.product?.price === 'string' 
                      ? parseFloat(item.product.price) 
                      : Number(item.product?.price || 0);
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="flex-1">{item.product?.name || 'Product'} x {item.quantity || 1}</span>
                        <span className="ml-2">₹{(price * (item.quantity || 1)).toFixed(2)}</span>
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
                {!selectedAddressId && addresses.length === 0 && (
                  <p className="text-sm text-red-500 mt-2 text-center">
                    Please add a shipping address
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
      <Footer />
    </div>
  );
}
