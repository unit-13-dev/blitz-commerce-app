'use client';

import { use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, MapPin, CreditCard } from "lucide-react";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProtectedRoute } from "@/lib/auth-utils";
import { apiClient } from "@/lib/api-client";

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/orders/${id}`);
      return data;
    },
  });

  const order = orderData?.order;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Header />
          <Layout>
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
          </Layout>
        </div>
      </ProtectedRoute>
    );
  }

  if (!order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Header />
          <Layout>
            <div className="text-center py-12">
              <p className="text-gray-600">Order not found</p>
            </div>
          </Layout>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header />
        <Layout>
          <div className="max-w-4xl mx-auto px-4 py-8 mt-20">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h1 className="text-2xl font-bold mb-2">Order #{order.orderNumber}</h1>
              <p className="text-gray-600">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h2>
                <p className="text-gray-600 whitespace-pre-line">{order.shippingAddressText}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </h2>
                <p className="text-gray-600 capitalize">{order.paymentMethod}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Status: <span className="capitalize">{order.paymentStatus}</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items
              </h2>
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 pb-4 border-b last:border-0">
                    <img
                      src={item.productImageUrl || "/placeholder.svg"}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ₹{typeof item.totalPrice === 'string' ? item.totalPrice : item.totalPrice.toString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        ₹{typeof item.unitPrice === 'string' ? item.unitPrice : item.unitPrice.toString()} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{typeof order.totalAmount === 'string' ? order.totalAmount : order.totalAmount.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>₹{typeof order.shippingAmount === 'string' ? order.shippingAmount : order.shippingAmount.toString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>₹{(typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount) : Number(order.totalAmount) + (typeof order.shippingAmount === 'string' ? parseFloat(order.shippingAmount) : Number(order.shippingAmount))).toFixed(2)}</span>
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

