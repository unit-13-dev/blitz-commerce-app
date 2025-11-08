'use client';

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, MapPin, CreditCard, Clock, CheckCircle, Truck, XCircle, AlertCircle, Calendar, Timer, RotateCcw, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api-client";
import { useState } from "react";

export default function OrderDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

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

  // Return request mutation
  const returnRequestMutation = useMutation({
    mutationFn: async ({ orderItemId, reason }: { orderItemId: string; reason?: string }) => {
      const { data } = await apiClient.post(`/orders/${id}/return`, {
        orderItemId,
        reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast({
        title: "Return request submitted",
        description: "Your return request has been submitted. Waiting for vendor approval.",
      });
      setReturnDialogOpen(false);
      setReason('');
      setSelectedItemId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit return request",
        variant: "destructive",
      });
    },
  });

  // Replace request mutation
  const replaceRequestMutation = useMutation({
    mutationFn: async ({ orderItemId, reason }: { orderItemId: string; reason?: string }) => {
      const { data } = await apiClient.post(`/orders/${id}/replace`, {
        orderItemId,
        reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast({
        title: "Replace request submitted",
        description: "Your replace request has been submitted. Waiting for vendor approval.",
      });
      setReplaceDialogOpen(false);
      setReason('');
      setSelectedItemId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit replace request",
        variant: "destructive",
      });
    },
  });

  const handleReturnRequest = (itemId: string) => {
    setSelectedItemId(itemId);
    setReturnDialogOpen(true);
  };

  const handleReplaceRequest = (itemId: string) => {
    setSelectedItemId(itemId);
    setReplaceDialogOpen(true);
  };

  const submitReturnRequest = () => {
    if (!selectedItemId) return;
    returnRequestMutation.mutate({ orderItemId: selectedItemId, reason });
  };

  const submitReplaceRequest = () => {
    if (!selectedItemId) return;
    replaceRequestMutation.mutate({ orderItemId: selectedItemId, reason });
  };

  const getRequestStatus = (requests: any[], type: 'return' | 'replace') => {
    const request = requests?.find((r: any) => r.type === type);
    if (!request) return null;
    return request.status;
  };

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
                    case 'return_requested':
                      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><RotateCcw className="w-3 h-3 mr-1" />Return Requested</Badge>;
                    case 'replace_requested':
                      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><RefreshCw className="w-3 h-3 mr-1" />Replace Requested</Badge>;
                    case 'return_approved':
                    case 'return_processed':
                      return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Return Processed</Badge>;
                    case 'replace_approved':
                    case 'replace_processed':
                      return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Replace Processed</Badge>;
                    case 'return_rejected':
                    case 'replace_rejected':
                      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Request Rejected</Badge>;
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
                {order.items.map((item: any) => {
                  const returnStatus = getRequestStatus(item.returnReplaceRequests, 'return');
                  const replaceStatus = getRequestStatus(item.returnReplaceRequests, 'replace');
                  const canReturn = item.product?.isReturnable && order.status === 'delivered' && !returnStatus;
                  const canReplace = item.product?.isReplaceable && order.status === 'delivered' && !replaceStatus;
                  const hasPendingRequest = returnStatus === 'pending' || replaceStatus === 'pending';
                  
                  return (
                    <div key={item.id} className="pb-4 border-b last:border-0">
                      <div className="flex items-center gap-4">
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
                          {/* Return/Replace Status */}
                          {(returnStatus || replaceStatus) && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {returnStatus === 'pending' && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Return Pending
                                </Badge>
                              )}
                              {returnStatus === 'approved' && (
                                <Badge variant="default" className="bg-green-100 text-green-700">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Return Approved
                                </Badge>
                              )}
                              {returnStatus === 'processed' && (
                                <Badge variant="default" className="bg-green-600 text-white">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Return Processed
                                </Badge>
                              )}
                              {returnStatus === 'rejected' && (
                                <Badge variant="destructive">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Return Rejected
                                </Badge>
                              )}
                              {replaceStatus === 'pending' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Replace Pending
                                </Badge>
                              )}
                              {replaceStatus === 'approved' && (
                                <Badge variant="default" className="bg-green-100 text-green-700">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Replace Approved
                                </Badge>
                              )}
                              {replaceStatus === 'processed' && (
                                <Badge variant="default" className="bg-green-600 text-white">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Replace Processed
                                </Badge>
                              )}
                              {replaceStatus === 'rejected' && (
                                <Badge variant="destructive">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Replace Rejected
                                </Badge>
                              )}
                            </div>
                          )}
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
                      
                      {/* Return/Replace Actions */}
                      {order.status === 'delivered' && (canReturn || canReplace) && !hasPendingRequest && (
                        <div className="mt-3 flex gap-2">
                          {canReturn && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReturnRequest(item.id)}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Request Return
                            </Button>
                          )}
                          {canReplace && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReplaceRequest(item.id)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Request Replace
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

            {/* Return Request Dialog */}
            <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Return</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for returning this item. The vendor will review your request.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="return-reason">Reason (Optional)</Label>
                    <Textarea
                      id="return-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="E.g., Product damaged, Wrong item received, etc."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={submitReturnRequest}
                    disabled={returnRequestMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {returnRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Replace Request Dialog */}
            <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Replacement</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for replacing this item. The vendor will review your request.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="replace-reason">Reason (Optional)</Label>
                    <Textarea
                      id="replace-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="E.g., Product defective, Wrong size, etc."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReplaceDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={submitReplaceRequest}
                    disabled={replaceRequestMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {replaceRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Layout>
        <Footer />
      </div>
  );
}

