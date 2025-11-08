'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, Clock, CheckCircle, Truck, XCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RecentOrdersProps {
  userId: string;
  limit?: number;
  showViewAll?: boolean;
}

const RecentOrders = ({ userId, limit = 5, showViewAll = true }: RecentOrdersProps) => {
  const router = useRouter();

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['recent-orders', userId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${userId}/recent-orders`);
      return data;
    },
    enabled: !!userId,
  });

  const orders = ordersResponse?.data?.orders || [];

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Recent Orders
        </h2>
        {showViewAll && orders.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/orders')}
            className="text-pink-600 hover:text-pink-700"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.slice(0, limit).map((order: any) => (
          <Card
            key={order.id}
            className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
            onClick={() => router.push(`/orders/${order.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-sm">Order #{order.orderNumber}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  {/* Order Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="space-y-2">
                      {order.items.slice(0, 2).map((item: any, index: number) => (
                        <div key={item.id || index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <img
                            src={item.productImageUrl || item.product?.images?.[0]?.imageUrl || "/placeholder.svg"}
                            alt={item.productName}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{item.productName}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-pink-600">
                    ₹{typeof order.totalAmount === 'string' 
                      ? parseFloat(order.totalAmount).toFixed(2) 
                      : order.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentOrders;

