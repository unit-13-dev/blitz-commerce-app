import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Truck, Home, ShoppingBag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { user } = useAuth();
  const [orderStatus, setOrderStatus] = useState<string>("paid");

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("Order ID not found");

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            product:products (
              id,
              name,
              image_url
            )
          )
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch user addresses for shipping address
  const { data: addresses } = useQuery({
    queryKey: ["user-addresses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Order not found</h2>
            <Button onClick={() => navigate("/orders")}>View All Orders</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const shippingAddress = addresses?.find(addr => addr.id === order.shipping_address_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600">Thank you for your purchase. Your order has been successfully placed.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number</span>
                    <span className="font-medium">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date</span>
                    <span className="font-medium">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium capitalize">{order.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status</span>
                    <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                      {order.payment_status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Status</span>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingAddress ? (
                    <div className="space-y-2">
                      <p className="font-medium">{shippingAddress.full_name}</p>
                      <p className="text-gray-600">{shippingAddress.phone_number}</p>
                      <p className="text-gray-600">
                        {shippingAddress.address_line1}
                        {shippingAddress.address_line2 && `, ${shippingAddress.address_line2}`}
                      </p>
                      <p className="text-gray-600">
                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {shippingAddress.address_type}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-gray-600">{order.shipping_address_text}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Items & Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <img
                          src={item.product_image_url || item.products?.image_url || "/placeholder.svg"}
                          alt={item.product_name || item.products?.name}
                          className="w-12 h-12 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">
                            {item.product_name || item.products?.name}
                          </h4>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-800">₹{item.total_price.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">₹{item.unit_price.toFixed(2)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{(order.total_amount - order.shipping_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>₹{order.shipping_amount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>₹{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              onClick={() => navigate("/products")}
              className="bg-pink-600 hover:bg-pink-700"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/orders")}
            >
              <Package className="w-4 h-4 mr-2" />
              View All Orders
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderConfirmation; 