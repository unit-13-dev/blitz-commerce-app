'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  AlertCircle,
  MapPin,
  User,
  Calendar,
  Timer,
  Ban,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string | number;
  shippingAmount: string | number;
  shippingAddressText: string;
  createdAt: string;
  confirmedAt?: string;
  dispatchedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  expectedDeliveryDate?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  user: {
    id: string;
    fullName?: string;
    email: string;
  };
  items: Array<{
    id: string;
    productName: string;
    productImageUrl?: string;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
  }>;
}

interface VendorOrderDetailProps {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

const VendorOrderDetail = ({ order, onClose, onUpdate }: VendorOrderDetailProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/vendor/orders/${order.id}/confirm`);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order confirmed successfully',
      });
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to confirm order',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data } = await apiClient.post(`/vendor/orders/${order.id}/reject`, {
        reason,
      });
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order rejected successfully',
      });
      onUpdate();
      onClose();
      setShowRejectDialog(false);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject order',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data } = await apiClient.patch(`/vendor/orders/${order.id}/status`, {
        status,
      });
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order status updated successfully',
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update order status',
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data } = await apiClient.post(`/vendor/orders/${order.id}/cancel`, {
        cancellationReason: reason,
      });
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order cancelled successfully. Refund has been processed for the customer.',
      });
      onUpdate();
      setShowCancelDialog(false);
      setCancelReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel order',
        variant: 'destructive',
      });
    },
  });

  // Check if order can be cancelled by vendor
  const canCancelOrder = () => {
    const status = order.status?.toLowerCase();
    // Can cancel if: pending, confirmed, or dispatched (before shipping)
    const cancellableStatuses = ['pending', 'confirmed', 'dispatched'];
    return cancellableStatuses.includes(status);
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
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
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateDaysRemaining = () => {
    if (!order.expectedDeliveryDate) return null;
    const expected = new Date(order.expectedDeliveryDate);
    const now = new Date();
    const diffTime = expected.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();
  const status = order.status.toLowerCase();

  const getNextStatus = () => {
    switch (status) {
      case 'confirmed':
        return 'dispatched';
      case 'dispatched':
        return 'shipped';
      case 'shipped':
        return 'delivered';
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Order #{order.orderNumber}
              {getStatusBadge(order.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Timeline */}
            {order.expectedDeliveryDate && daysRemaining !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Delivery Timeline</h3>
                </div>
                <p className={`text-sm font-medium ${
                  daysRemaining < 0 
                    ? 'text-red-600' 
                    : daysRemaining <= 2 
                    ? 'text-orange-600' 
                    : 'text-green-600'
                }`}>
                  {daysRemaining < 0 
                    ? `Overdue by ${Math.abs(daysRemaining)} days` 
                    : daysRemaining === 0 
                    ? 'Due today' 
                    : `${daysRemaining} days remaining until expected delivery`}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Expected delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>
                <p className="text-sm text-gray-600">{order.user.fullName || 'N/A'}</p>
                <p className="text-sm text-gray-600">{order.user.email}</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Address
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{order.shippingAddressText}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 pb-3 border-b last:border-0">
                    {item.productImageUrl && (
                      <img
                        src={item.productImageUrl}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ₹{typeof item.totalPrice === 'string' ? item.totalPrice : item.totalPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ₹{typeof item.unitPrice === 'string' ? item.unitPrice : item.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{(typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount) : Number(order.totalAmount) - (typeof order.shippingAmount === 'string' ? parseFloat(order.shippingAmount) : Number(order.shippingAmount))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>₹{typeof order.shippingAmount === 'string' ? order.shippingAmount : order.shippingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>₹{(typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount) : Number(order.totalAmount) + (typeof order.shippingAmount === 'string' ? parseFloat(order.shippingAmount) : Number(order.shippingAmount))).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Status History */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Status History
              </h3>
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
                    <span className="text-gray-600">Delivered</span>
                    <span>{new Date(order.deliveredAt).toLocaleString()}</span>
                  </div>
                )}
                {order.cancelledAt && (
                  <div className="flex justify-between">
                    <span className="text-red-600">Cancelled</span>
                    <span>{new Date(order.cancelledAt).toLocaleString()}</span>
                  </div>
                )}
                {order.cancellationReason && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-700">Cancellation Reason: {order.cancellationReason}</p>
                  </div>
                )}
                {order.rejectedAt && (
                  <div className="flex justify-between">
                    <span className="text-red-600">Rejected</span>
                    <span>{new Date(order.rejectedAt).toLocaleString()}</span>
                  </div>
                )}
                {order.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-700">Rejection Reason: {order.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t flex-wrap">
              {status === 'pending' && (
                <>
                  <Button
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending}
                    className="flex-1 min-w-[120px]"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    className="flex-1 min-w-[120px]"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Order
                  </Button>
                </>
              )}
              {canCancelOrder() && status !== 'pending' && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  className="flex-1 min-w-[120px]"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancel Order
                </Button>
              )}
              {nextStatus && status !== 'delivered' && status !== 'rejected' && status !== 'cancelled' && (
                <Button
                  onClick={() => updateStatusMutation.mutate(nextStatus)}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 min-w-[120px]"
                >
                  {nextStatus === 'dispatched' && <Truck className="w-4 h-4 mr-2" />}
                  {nextStatus === 'shipped' && <Package className="w-4 h-4 mr-2" />}
                  {nextStatus === 'delivered' && <CheckCircle className="w-4 h-4 mr-2" />}
                  Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="min-w-[100px]">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="mt-2"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate(rejectionReason)}
                  disabled={rejectMutation.isPending}
                  className="flex-1"
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this order? This will refund the customer and restore product stock.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  What happens when you cancel:
                </p>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  <li>Order will be cancelled immediately</li>
                  <li>Customer will receive a full refund</li>
                  <li>Product stock will be restored</li>
                  <li>Customer will be notified via email</li>
                </ul>
              </div>
              <div>
                <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
                <Textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="E.g., Out of stock, Unable to fulfill order, etc."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
              }}>
                Keep Order
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate(cancelReason)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default VendorOrderDetail;

