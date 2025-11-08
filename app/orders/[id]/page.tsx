'use client';

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, MapPin, CreditCard, Clock, CheckCircle, Truck, XCircle, AlertCircle, Calendar, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api-client";

export default function OrderDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) throw new Error('Order ID is required');
      const response = await apiClient.get(`/orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const order = orderData?.data?.order;

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

  if (!order) {
    return (
        <div className="min-h-screen">
          <Header />
          <Layout>
            <div className="text-center py-12">
              <p className="text-gray-600">Order not found</p>
            </div>
          </Layout>
        </div>
    );
  }

  return (
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
              <div className="mt-4 flex items-center gap-3">
                {(() => {
                  const statusLower = order.status?.toLowerCase() || '';
                  switch (statusLower) {
                    case 'pending':
                      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
                    case 'confirmed':
                      return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
                    case 'dispatched':
                      return <Badge variant="default" className="bg-purple-100 text-purple-700 border-purple-200"><Truck className="w-3 h-3 mr-1" />Dispatched</Badge>;
                    case 'shipped':
                      return <Badge variant="default" className="bg-indigo-100 text-indigo-700 border-indigo-200"><Package className="w-3 h-3 mr-1" />Shipped</Badge>;
                    case 'delivered':
                      return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
                    case 'cancelled':
                      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
                    case 'rejected':
                      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
                    default:
                      return <Badge variant="secondary">{order.status}</Badge>;
                  }
                })()}
              </div>
              
              {/* Delivery Timeline */}
              {order.expectedDeliveryDate && (() => {
                const expected = new Date(order.expectedDeliveryDate);
                const now = new Date();
                const diffTime = expected.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Expected Delivery</h3>
                    </div>
                    <p className={`text-sm font-medium ${
                      diffDays < 0 
                        ? 'text-red-600' 
                        : diffDays <= 2 
                        ? 'text-orange-600' 
                        : 'text-green-600'
                    }`}>
                      {diffDays < 0 
                        ? `Overdue by ${Math.abs(diffDays)} days` 
                        : diffDays === 0 
                        ? 'Due today' 
                        : `${diffDays} days remaining`}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {expected.toLocaleDateString()}
                    </p>
                  </div>
                );
              })()}
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

            {/* Status History */}
            {(order.confirmedAt || order.dispatchedAt || order.shippedAt || order.deliveredAt || order.rejectedAt) && (
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Status History
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Placed</span>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  {order.confirmedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confirmed</span>
                      <span>{new Date(order.confirmedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.dispatchedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dispatched</span>
                      <span>{new Date(order.dispatchedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.shippedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipped</span>
                      <span>{new Date(order.shippedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-green-600 font-medium">Delivered</span>
                      <span className="text-green-600">{new Date(order.deliveredAt).toLocaleString()}</span>
                    </div>
                  )}
                  {order.rejectedAt && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-red-600">Rejected</span>
                        <span className="text-red-600">{new Date(order.rejectedAt).toLocaleString()}</span>
                      </div>
                      {order.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700">Reason: {order.rejectionReason}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </Layout>
        <Footer />
      </div>
  );
}

