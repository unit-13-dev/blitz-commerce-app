'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, RefreshCw, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { useState } from 'react';

const VendorReturnReplaceRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requestsResponse, isLoading } = useQuery({
    queryKey: ['vendor-return-replace-requests'],
    queryFn: async () => {
      const { data } = await apiClient.get('/vendor/return-replace', {
        params: { status: 'pending' },
      });
      return data;
    },
  });

  const requests = requestsResponse?.data?.requests || [];

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await apiClient.post(`/vendor/return-replace/${requestId}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-return-replace-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      toast({
        title: "Request approved",
        description: "The return/replace request has been approved and processed.",
      });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { data } = await apiClient.post(`/vendor/return-replace/${requestId}/reject`, {
        rejectionReason: reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-return-replace-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      toast({
        title: "Request rejected",
        description: "The return/replace request has been rejected.",
      });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleReject = (request: any) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedRequest) return;
    approveMutation.mutate(selectedRequest.id);
  };

  const confirmReject = () => {
    if (!selectedRequest) return;
    rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectionReason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Return/Replace Requests</h3>
        <Badge variant="outline">{requests.length} pending</Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No pending return/replace requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {request.type === 'return' ? (
                      <RotateCcw className="w-5 h-5 text-orange-600" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                    )}
                    {request.type === 'return' ? 'Return' : 'Replace'} Request
                  </CardTitle>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Order:</p>
                    <p className="font-medium">#{request.order.orderNumber}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Product:</p>
                    <div className="flex items-center gap-3 mt-2">
                      <img
                        src={request.orderItem.productImageUrl || request.orderItem.product?.images?.[0]?.imageUrl || "/placeholder.svg"}
                        alt={request.orderItem.productName}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{request.orderItem.productName}</p>
                        <p className="text-sm text-gray-600">
                          Quantity: {request.orderItem.quantity}
                        </p>
                        <p className="text-sm text-gray-600">
                          Price: ₹{typeof request.orderItem.totalPrice === 'string' 
                            ? request.orderItem.totalPrice 
                            : request.orderItem.totalPrice.toString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Customer:</p>
                    <p className="font-medium">
                      {request.user.fullName || request.user.email}
                    </p>
                  </div>

                  {request.reason && (
                    <div>
                      <p className="text-sm text-gray-600">Reason:</p>
                      <p className="text-sm">{request.reason}</p>
                    </div>
                  )}

                  {request.type === 'return' && request.returnAmount && (
                    <div>
                      <p className="text-sm text-gray-600">Refund Amount:</p>
                      <p className="font-semibold text-green-600">
                        ₹{typeof request.returnAmount === 'string' 
                          ? request.returnAmount 
                          : request.returnAmount.toString()}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(request)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this {selectedRequest?.type} request?
              {selectedRequest?.type === 'return' && ' A refund will be processed.'}
              {selectedRequest?.type === 'replace' && ' A replacement will be processed.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Product is not eligible for return/replace, etc."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              variant="destructive"
            >
              {rejectMutation.isPending ? 'Processing...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorReturnReplaceRequests;

