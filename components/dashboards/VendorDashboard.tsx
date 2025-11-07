'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import KYCForm from '@/components/KYCForm';
import ProductForm from '@/components/ProductForm';
import Header from '../Header';

const VendorDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showKYCForm, setShowKYCForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  const { data: kycResponse } = useQuery({
    queryKey: ['kyc', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await apiClient.get(`/kyc/${profile.id}`);
      return data.kyc;
    },
    enabled: !!profile?.id,
  });

  const kycData = kycResponse || null;

  const { data: productsResponse } = useQuery({
    queryKey: ['vendor-products', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await apiClient.get('/products', {
        params: { vendorId: profile.id },
      });
      return data.products || [];
    },
    enabled: !!profile?.id,
  });

  const products = productsResponse || [];

  const getKYCStatusBadge = () => {
    if (!kycData) return <Badge variant="secondary">Not Submitted</Badge>;
    
    switch (kycData.status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-4 h-4 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-4 h-4 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="w-4 h-4 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // const canAddProducts = kycData?.status === 'approved';

  return (
    <div className="container mx-auto px-4 py-8">
      <Header />
      <div className="max-w-6xl mx-auto mt-24">
        <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">KYC Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {getKYCStatusBadge()}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{products?.length || 0}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {products?.filter((p: any) => p.isActive).length || 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    My Products ({products?.length || 0})
                  </span>
                  <Button 
                    onClick={() => setShowProductForm(true)}
                    // disabled={!canAddProducts}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* {!canAddProducts && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800">
                      You need to complete KYC verification before adding products.
                    </p>
                  </div>
                )} */}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products?.map((product: any) => (
                    <div key={product.id} className="border rounded-lg p-4">
                      {(product.images?.[0]?.imageUrl || product.imageUrl) && (
                        <img 
                          src={product.images?.[0]?.imageUrl || product.imageUrl} 
                          alt={product.name}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <h4 className="font-medium mb-2">{product.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">₹{product.price}</span>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* {!products || products.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    {canAddProducts ? "No products yet. Add your first product!" : "Complete KYC to start adding products."}
                  </p>
                )} */}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  KYC Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kycData ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      {getKYCStatusBadge()}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Business Name</Label>
                        <p className="text-sm text-gray-600">{kycData.business_name}</p>
                      </div>
                      <div>
                        <Label>GST Number</Label>
                        <p className="text-sm text-gray-600">{kycData.gst_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label>Aadhar Number</Label>
                        <p className="text-sm text-gray-600">{kycData.aadhar_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label>Submitted</Label>
                        <p className="text-sm text-gray-600">
                          {new Date(kycData.submitted_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Business Address</Label>
                      <p className="text-sm text-gray-600">{kycData.business_address}</p>
                    </div>
                    
                    {kycData.status === 'rejected' && kycData.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-2">Rejection Reason</h4>
                        <p className="text-red-700">{kycData.rejection_reason}</p>
                        <Button 
                          className="mt-2" 
                          variant="outline"
                          onClick={() => setShowKYCForm(true)}
                        >
                          Resubmit KYC
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      Complete your KYC verification to start selling products.
                    </p>
                    <Button onClick={() => setShowKYCForm(true)}>
                      Start KYC Verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showKYCForm && (
          <KYCForm
            onClose={() => setShowKYCForm(false)}
            existingData={kycData}
          />
        )}

        {showProductForm && (
          <ProductForm
            onClose={() => setShowProductForm(false)}
          />
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
