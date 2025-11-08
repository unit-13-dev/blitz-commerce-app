'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Clock, CheckCircle, Truck, Package, XCircle, AlertCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import VendorOrderDetail from './VendorOrderDetail';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string | number;
  shippingAmount: string | number;
  shippingAddressText: string;
  createdAt: string;
  confirmedAt?: string;
  expectedDeliveryDate?: string;
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

interface VendorOrderListProps {
    vendorId: string;
}

const VendorOrderList = ({ vendorId }: VendorOrderListProps) => {
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: ordersData, isLoading, refetch } = useQuery({
        queryKey: ['vendor-orders', vendorId, selectedStatus],
        queryFn: async () => {
            const { data } = await apiClient.get('/vendor/orders', {
                params: { status: selectedStatus === 'all' ? undefined : selectedStatus },
            });
            return data.data;
        },
        enabled: !!vendorId,
        refetchInterval: 30000, // Poll every 30 seconds for new orders
    });

    const orders: Order[] = ordersData?.orders || [];
    const counts = ordersData?.counts || {
        all: 0,
        pending: 0,
        confirmed: 0,
        dispatched: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        rejected: 0,
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
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const calculateDaysRemaining = (expectedDeliveryDate?: string) => {
        if (!expectedDeliveryDate) return null;
        const expected = new Date(expectedDeliveryDate);
        const now = new Date();
        const diffTime = expected.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        Orders Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                            <TabsTrigger value="all">
                                All ({counts.all})
                            </TabsTrigger>
                            <TabsTrigger value="pending">
                                Pending ({counts.pending})
                                {counts.pending > 0 && (
                                    <span className="ml-1 w-2 h-2 bg-yellow-500 rounded-full inline-block"></span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="confirmed">Confirmed ({counts.confirmed})</TabsTrigger>
                            <TabsTrigger value="dispatched">Dispatched ({counts.dispatched})</TabsTrigger>
                            <TabsTrigger value="shipped">Shipped ({counts.shipped})</TabsTrigger>
                            <TabsTrigger value="delivered">Delivered ({counts.delivered})</TabsTrigger>
                            <TabsTrigger value="cancelled">Cancelled ({counts.cancelled})</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
                        </TabsList>

                        <div className="space-y-4">
                            {orders.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No orders found</p>
                                </div>
                            ) : (
                                orders.map((order) => {
                                    const daysRemaining = calculateDaysRemaining(order.expectedDeliveryDate);
                                    return (
                                        <div
                                            key={order.id}
                                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                                                        {getStatusBadge(order.status)}
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        Customer: {order.user.fullName || order.user.email}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        Placed: {new Date(order.createdAt).toLocaleDateString()}
                                                    </p>
                                                    {order.expectedDeliveryDate && daysRemaining !== null && (
                                                        <p className={`text-sm font-medium mt-1 ${daysRemaining < 0
                                                                ? 'text-red-600'
                                                                : daysRemaining <= 2
                                                                    ? 'text-orange-600'
                                                                    : 'text-green-600'
                                                            }`}>
                                                            {daysRemaining < 0
                                                                ? `Overdue by ${Math.abs(daysRemaining)} days`
                                                                : daysRemaining === 0
                                                                    ? 'Due today'
                                                                    : `${daysRemaining} days remaining`}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">
                                                        ₹{typeof order.totalAmount === 'string' ? order.totalAmount : order.totalAmount.toFixed(2)}
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-2"
                                                        onClick={() => setSelectedOrder(order)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {order.items.slice(0, 3).map((item) => (
                                                    <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                                                        {item.productImageUrl && (
                                                            <img
                                                                src={item.productImageUrl}
                                                                alt={item.productName}
                                                                className="w-8 h-8 object-cover rounded"
                                                            />
                                                        )}
                                                        <span>{item.productName} x{item.quantity}</span>
                                                    </div>
                                                ))}
                                                {order.items.length > 3 && (
                                                    <span className="text-sm text-gray-500">+{order.items.length - 3} more</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            {selectedOrder && (
                <VendorOrderDetail
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={() => {
                        refetch();
                        queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
                    }}
                />
            )}
        </>
    );
};

export default VendorOrderList;

