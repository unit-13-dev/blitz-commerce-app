'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Globe, Users, Package } from "lucide-react";
import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";

interface CreateGroupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedProductId?: string; // Optional: pre-select a specific product
}

const CreateGroupModal = ({ isOpen, onOpenChange, onSuccess, preSelectedProductId }: CreateGroupModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    product_id: preSelectedProductId || "", // Pre-select product if provided
    is_private: true, // Default to private
    member_limit: 50,
    time_limit_hours: 24, // Default 24 hours
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when preSelectedProductId changes
  useEffect(() => {
    if (preSelectedProductId) {
      setFormData(prev => ({
        ...prev,
        product_id: preSelectedProductId
      }));
    }
  }, [preSelectedProductId]);

  const { data: products = [] } = useQuery({
    queryKey: ["available-products"],
    queryFn: async () => {
      const { data } = await apiClient.get('/products', {
        params: { limit: 100, isActive: true }
      });
      return (data?.products || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        group_order_enabled: product.groupOrderEnabled,
        image_url: product.images?.[0]?.imageUrl || product.imageUrl || null,
      }));
    },
    enabled: isOpen,
  });

  const { data: productTiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ["product-tiers", formData.product_id],
    queryFn: async () => {
      if (!formData.product_id) return [];

      const { data } = await apiClient.get(`/products/${formData.product_id}`);
      return data?.product?.discountTiers || [];
    },
    enabled: !!formData.product_id && isOpen,
  });

  const selectedProduct = products.find((p: any) => p.id === formData.product_id);

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: typeof formData) => {
      if (!user) throw new Error("Please log in to create a group");

      const { data } = await apiClient.post('/groups', {
        name: groupData.name,
        description: groupData.description,
        productId: groupData.product_id,
        isPrivate: groupData.is_private,
        memberLimit: groupData.member_limit,
        accessCode: groupData.is_private ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
      });

      return data.group;
    },
    onSuccess: (data) => {
      console.log("Group creation successful:", data);
      
      toast({
        title: "Group created successfully!",
        description: data.isPrivate 
          ? `Private group "${data.name}" created with access code: ${data.accessCode || 'N/A'}`
          : `Public group "${data.name}" created successfully`,
      });
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        product_id: "",
        is_private: true, // Reset to private default
        member_limit: 50,
        time_limit_hours: 24,
      });
      
      // Close modal
      onOpenChange(false);
      
      // Invalidate queries with more specific keys
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      queryClient.invalidateQueries({ queryKey: ["user-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
      
      // Call success callback
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Group creation error:", error);
      toast({
        title: "Error creating group",
        description: error.response?.data?.message || error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.product_id) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    createGroupMutation.mutate(formData, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            Create New Group
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your group"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-select">Product *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: any) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center gap-2">
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-6 h-6 rounded object-cover"
                      />
                      <span>{product.name}</span>
                      <span className="text-gray-500">₹{product.price}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <img
                  src={selectedProduct.image_url || "/placeholder.svg"}
                  alt={selectedProduct.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">₹{selectedProduct.price}</p>
                </div>
              </div>
              
              {/* Debug info - remove in production */}
              {/* <div className="mt-2 text-xs text-gray-500">
                Product ID: {selectedProduct.id} | Tiers: {productTiers.length} | Loading: {tiersLoading ? 'Yes' : 'No'}
                {tiersError && (
                  <div className="text-red-500 mt-1">
                    Error: {tiersError.message}
                  </div>
                )}
              </div> */}
            </div>
          )}

          {productTiers.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-medium mb-2 text-green-800 dark:text-green-200">Discount Tiers</h3>
              <div className="space-y-2">
                {productTiers.map((tier: any) => (
                  <div key={tier.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-700 dark:text-green-300">
                        Tier {tier.tier_number}:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {tier.members_required}+ members
                      </span>
                    </div>
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      {tier.discount_percentage}% off
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                * Discounts apply when group reaches the required member count
              </p>
            </div>
          )}

          {selectedProduct && productTiers.length === 0 && !tiersLoading && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  {/* <p className="font-medium">
                    {tiersError ? "Error Loading Discount Tiers" : "No Discount Tiers Available"}
                  </p>
                  <p className="text-xs mt-1">
                    {tiersError 
                      ? `Unable to load discount tiers. Please try again later. (${tiersError.message})`
                      : "This product doesn't have any discount tiers set up yet. The group will use the standard price of ₹" + selectedProduct.price + "."
                    }
                  </p> */}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="member-limit">Member Limit</Label>
            <Select
              value={formData.member_limit.toString()}
              onValueChange={(value) => setFormData({ ...formData, member_limit: parseInt(value) })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 members</SelectItem>
                <SelectItem value="25">25 members</SelectItem>
                <SelectItem value="50">50 members</SelectItem>
                <SelectItem value="100">100 members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-limit">Time Limit (Hours)</Label>
            <Select
              value={formData.time_limit_hours.toString()}
              onValueChange={(value) => setFormData({ ...formData, time_limit_hours: parseInt(value) })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="12">12 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Groups are now exclusively private */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Private Group</p>
                <p className="text-xs mt-1">
                  • Only visible to members<br/>
                  • Access code will be generated automatically<br/>
                  • Share the code to invite others
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.product_id}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal; 