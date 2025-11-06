import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ArrowLeft,
  Search,
  Download,
  Package,
  Users,
  ShoppingCart,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Eye,
  MapPin,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from '../hooks/use-toast';
import { getProductImages } from '../lib/utils';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: string;
  shipping_address_text: string;
  created_at: string;
  is_group_order: boolean;
  group_id?: string;
  participant_count?: number;
  discount_percentage?: number;
  order_items: OrderItem[];
  profiles: {
    full_name: string;
    email: string;
  };
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image_url: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name: string;
    image_url: string;
  };
}

interface GroupOrderParticipant {
  id: string;
  user_id: string;
  quantity: number;
  unit_price: number;
  final_price: number;
  shipping_address_text: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500';
    case 'paid': return 'bg-blue-500';
    case 'processing': return 'bg-purple-500';
    case 'shipped': return 'bg-green-500';
    case 'delivered': return 'bg-green-600';
    case 'cancelled': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'paid': return <CheckCircle className="w-4 h-4" />;
    case 'processing': return <Package className="w-4 h-4" />;
    case 'shipped': return <Truck className="w-4 h-4" />;
    case 'delivered': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <AlertCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const VendorOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Always call hooks at the top level
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setProfile(data);
          setProfileLoading(false);
        });
    } else {
      setProfileLoading(false);
    }
  }, [user]);

  // Fetch all group orders as before
  const { data: groupOrders = [], isLoading: groupLoading } = useQuery({
    queryKey: ['vendor-group-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              vendor_id,
              image_url
            )
          ),
          profiles (
            full_name,
            email
          )
        `)
        .eq('order_items.products.vendor_id', user.id)
        .eq('is_group_order', true)
        .order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch product images for all group orders
      const productIds = data?.flatMap(order => 
        order.order_items?.map(item => item.products?.id).filter(Boolean) || []
      ) || [];
      
      if (productIds.length > 0) {
        const productImages = await getProductImages(productIds);
        
        // Add image_url to each order item
        const ordersWithImages = data?.map(order => ({
          ...order,
          order_items: order.order_items?.map(item => ({
            ...item,
            products: {
              ...item.products,
              image_url: productImages[item.products?.id] || item.products?.image_url || null
            }
          }))
        })) || [];
        
        return ordersWithImages;
      } else {
        return data || [];
      }
    },
    enabled: !!user?.id,
  });

  // Fetch all individual order_items for this vendor
  const { data: individualOrderItems = [], isLoading: individualLoading } = useQuery({
    queryKey: ['vendor-individual-order-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('order_items')
        .select(`
          *,
          orders (
            *,
            profiles (full_name, email)
          ),
          products (id, name, vendor_id, image_url)
        `)
        .eq('products.vendor_id', user.id);
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter in JS for non-group orders
      const filteredData = (data || []).filter(item => item.orders && !item.orders.is_group_order);
      
      // Fetch product images for all individual order items
      const productIds = filteredData.map(item => item.products?.id).filter(Boolean);
      const productImages = await getProductImages(productIds);
      
      // Add image_url to each item
      const itemsWithImages = filteredData.map(item => ({
        ...item,
        products: {
          ...item.products,
          image_url: productImages[item.products?.id] || item.products?.image_url || null
        }
      }));
      
      return itemsWithImages;
    },
    enabled: !!user?.id,
  });

  // Group individual order_items by order_id
  const individualOrdersGrouped = React.useMemo(() => {
    const grouped: Record<string, any> = {};
    for (const item of individualOrderItems) {
      const order = item.orders;
      if (!order) continue;
      if (!grouped[order.id]) {
        grouped[order.id] = {
          ...order,
          order_items: [],
        };
      }
      grouped[order.id].order_items.push(item);
    }
    return Object.values(grouped);
  }, [individualOrderItems]);

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      toast({ title: 'Order status updated successfully!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating order status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const downloadCSV = (orderData: Order[]) => {
    const headers = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Product',
      'Quantity',
      'Total Amount',
      'Status',
      'Shipping Address',
      'Order Date',
      'Order Type',
    ];
    const csvData = orderData.map(order => [
      order.order_number,
      order.profiles?.full_name || 'N/A',
      order.profiles?.email || 'N/A',
      order.order_items?.[0]?.product_name || 'N/A',
      order.order_items?.[0]?.quantity || 0,
      order.total_amount,
      order.status,
      order.shipping_address_text,
      new Date(order.created_at).toLocaleDateString(),
      order.is_group_order ? 'Group Order' : 'Individual Order',
    ]);
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'group':
        return groupOrders;
      case 'individual':
        return individualOrdersGrouped;
      default:
        return groupOrders;
    }
  };
  const filteredOrders = getFilteredOrders();

  // Now do conditional rendering
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  if (!profile || profile.role !== 'vendor') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">Only vendors can access this page.</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-pink-50">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(-1)}
                className="mb-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center">
                  <Package className="w-8 h-8 mr-3" />
                  Vendor Orders
                </h1>
                <p className="text-gray-600 mt-1">Manage orders for your products</p>
              </div>
            </div>
            <Button onClick={() => downloadCSV(filteredOrders)}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by order number, customer name, email, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Orders ({groupOrders.length + individualOrdersGrouped.length})</TabsTrigger>
              <TabsTrigger value="group">
                <Users className="w-4 h-4 mr-2" />
                Group Orders ({groupOrders.length})
              </TabsTrigger>
              <TabsTrigger value="individual">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Individual Orders ({individualOrdersGrouped.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No orders found</h2>
                  <p className="text-gray-600">No orders match your current filters.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    participants={[]} // No participants for group orders in this tab
                    onStatusUpdate={updateOrderStatusMutation.mutate}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="group" className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No group orders</h2>
                  <p className="text-gray-600">No group orders found.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    participants={[]} // No participants for group orders in this tab
                    onStatusUpdate={updateOrderStatusMutation.mutate}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No individual orders</h2>
                  <p className="text-gray-600">No individual orders found.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    participants={[]} // No participants for individual orders in this tab
                    onStatusUpdate={updateOrderStatusMutation.mutate}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

// Order Card Component
interface OrderCardProps {
  order: Order;
  participants: GroupOrderParticipant[];
  onStatusUpdate: (data: { orderId: string; status: OrderStatus }) => void;
}

const OrderCard = ({ order, participants, onStatusUpdate }: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isGroupOrder = order.is_group_order;

  return (
    <Card className={`w-full ${isGroupOrder ? 'border-2 border-pink-200 bg-gradient-to-br from-pink-50/50 to-white' : 'border border-gray-200 bg-white'} shadow-lg hover:shadow-xl transition-all duration-300`}>
      <CardHeader className="pb-6">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                {isGroupOrder ? (
                  <div className="p-2 bg-pink-100 rounded-full">
                    <Users className="w-5 h-5 text-pink-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {isGroupOrder ? 'Group Order' : 'Order'}
                  </CardTitle>
                  <p className="text-sm text-gray-500 font-mono">
                    {order.order_number}
                  </p>
                </div>
              </div>
              <Badge className={`${getStatusColor(order.status)} text-white px-3 py-1.5 font-medium shadow-sm`}>
                {getStatusIcon(order.status)}
                <span className="ml-1.5 capitalize">{order.status}</span>
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-green-600 mb-1">₹{order.total_amount}</p>
            {isGroupOrder && order.discount_percentage && (
              <p className="text-sm text-pink-600 font-medium bg-pink-50 px-2 py-1 rounded-full">
                {order.discount_percentage}% group discount
              </p>
            )}
          </div>
        </div>

        {/* Customer Info Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Customer</span>
            </div>
            <p className="text-gray-900 font-semibold">{order.profiles?.full_name || 'N/A'}</p>
            <p className="text-sm text-gray-600">{order.profiles?.email || 'N/A'}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Order Details</span>
            </div>
            <p className="text-gray-900 font-semibold">
              {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
            {isGroupOrder && (
              <p className="text-sm text-gray-600">
                {order.participant_count || participants.length} participant{order.participant_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-6">
        {/* Product Details */}
        <div>
          <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            Product Details
          </h4>
          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
            <div className="flex-shrink-0">
              <img
                src={order.order_items?.[0]?.products?.image_url || '/placeholder.svg'}
                alt={order.order_items?.[0]?.products?.name || 'Product'}
                className="w-28 h-28 object-cover rounded-lg shadow-md border border-gray-200"
                onError={(e) => {
                  console.log('Image failed to load, using placeholder');
                  e.currentTarget.src = '/placeholder.svg';
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', order.order_items?.[0]?.products?.image_url);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-bold text-lg text-gray-900 truncate">
                  {order.order_items?.[0]?.products?.name || 'N/A'}
                </h5>
                <span className="text-sm text-gray-500 font-mono">
                  #{order.order_items?.[0]?.product_id || 'N/A'}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Quantity:</span> {order.order_items?.[0]?.quantity || 0}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Unit Price:</span> ₹{order.order_items?.[0]?.unit_price || 0}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Total:</span> ₹{(order.order_items?.[0]?.quantity || 0) * (order.order_items?.[0]?.unit_price || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div>
          <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            Shipping Address
          </h4>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-gray-800 font-medium leading-relaxed">
              {order.shipping_address_text || 'Address not available'}
            </p>
          </div>
        </div>

        {/* Group Order Participants */}
        {isGroupOrder && participants.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                Participants ({participants.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
              >
                {isExpanded ? 'Show Less' : 'Show Details'}
              </Button>
            </div>
            
            {isExpanded && (
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div key={participant.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-pink-600">
                              {participant.profiles?.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {participant.profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {participant.profiles?.email || 'No email'}
                            </p>
                          </div>
                        </div>
                        <div className="ml-11 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Quantity:</span> {participant.quantity} × ₹{participant.unit_price}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {participant.shipping_address_text}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-green-600 text-lg">₹{participant.final_price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Order Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <Select
              value={order.status}
              onValueChange={(value) => onStatusUpdate({ orderId: order.id, status: value as OrderStatus })}
            >
              <SelectTrigger className="w-48 bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="paid">✅ Paid</SelectItem>
                <SelectItem value="processing">⚙️ Processing</SelectItem>
                <SelectItem value="shipped">🚚 Shipped</SelectItem>
                <SelectItem value="delivered">📦 Delivered</SelectItem>
                <SelectItem value="cancelled">❌ Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-gray-300">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorOrders; 