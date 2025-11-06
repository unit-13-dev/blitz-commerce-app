import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  TrendingUp, AlertTriangle, Users, Package, CheckCircle, 
  XCircle, Loader2, Target, Plus, Trash2, Undo2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscountTier {
  members_required: number;
  discount_percentage: number;
}

interface BulkDiscountModalProps {
  selectedProductIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductInfo {
  id: string;
  name: string;
  image_url?: string;
  price: number;
  hasTiers: boolean;
}

const BulkDiscountModal = ({ selectedProductIds, onClose, onSuccess }: BulkDiscountModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<'configure' | 'confirm' | 'processing' | 'results'>('configure');
  const [tiers, setTiers] = useState<DiscountTier[]>([
    { members_required: 5, discount_percentage: 10 },
    { members_required: 15, discount_percentage: 20 },
    { members_required: 50, discount_percentage: 30 }
  ]);
  const [processingResults, setProcessingResults] = useState<{
    successful: string[];
    failed: { productId: string; error: string }[];
    skipped: string[];
  }>({ successful: [], failed: [], skipped: [] });

  // Fetch product information
  const { data: productsInfo = [] } = useQuery<ProductInfo[]>({
    queryKey: ['bulk-products-info', selectedProductIds],
    queryFn: async () => {
      // Fetch products data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, image_url, price')
        .in('id', selectedProductIds);

      if (productsError) throw productsError;

      // Fetch existing tiers
      const { data: existingTiers, error: tiersError } = await supabase
        .from('product_discount_tiers')
        .select('product_id')
        .in('product_id', selectedProductIds);

      if (tiersError) throw tiersError;

      const productsWithTiers = new Set(existingTiers.map(t => t.product_id));

      return products.map(p => ({
        ...p,
        hasTiers: productsWithTiers.has(p.id)
      }));
    },
    enabled: selectedProductIds.length > 0,
  });

  // Calculate statistics
  const productsWithTiers = productsInfo.filter(p => p.hasTiers);
  const productsWithoutTiers = productsInfo.filter(p => !p.hasTiers);
  const totalProducts = productsInfo.length;

  // Tier management functions
  const addTier = () => {
    if (tiers.length >= 3) return;
    setTiers(prev => [...prev, { members_required: 0, discount_percentage: 0 }]);
  };

  const removeTier = (index: number) => {
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof DiscountTier, value: number) => {
    setTiers(prev => 
      prev.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    );
  };

  // Bulk apply mutation
  const bulkApplyMutation = useMutation({
    mutationFn: async () => {
      const results = {
        successful: [] as string[],
        failed: [] as { productId: string; error: string }[],
        updated: [] as string[],
        newlyCreated: [] as string[]
      };

      for (const productId of selectedProductIds) {
        try {
          const productInfo = productsInfo.find(p => p.id === productId);
          
          // Always delete existing tiers first (complete replacement)
          await supabase
            .from('product_discount_tiers')
            .delete()
            .eq('product_id', productId);

          // Insert new tiers
          const validTiers = tiers.filter(tier => 
            tier.members_required > 0 && tier.discount_percentage > 0
          );

          if (validTiers.length > 0) {
            const tiersData = validTiers.map((tier, index) => ({
              product_id: productId,
              tier_number: index + 1,
              members_required: tier.members_required,
              discount_percentage: tier.discount_percentage,
            }));

            const { error: insertError } = await supabase
              .from('product_discount_tiers')
              .insert(tiersData);

            if (insertError) throw insertError;

            // Update product group_order_enabled
            const { error: updateError } = await supabase
              .from('products')
              .update({ group_order_enabled: true })
              .eq('id', productId);

            if (updateError) throw updateError;

            results.successful.push(productId);
            
            // Track whether this was an update or new creation
            if (productInfo?.hasTiers) {
              results.updated.push(productId);
            } else {
              results.newlyCreated.push(productId);
            }
          }
        } catch (error: any) {
          results.failed.push({
            productId,
            error: error.message || 'Unknown error'
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setProcessingResults(results);
      setStep('results');
      
      // Show success toast
      const successCount = results.successful.length;
      const failedCount = results.failed.length;
      
      toast({
        title: "Bulk Update Complete",
        description: `${successCount} products updated, ${failedCount} failed`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update products",
        variant: "destructive"
      });
    }
  });

  const handleApply = () => {
    setStep('processing');
    bulkApplyMutation.mutate();
  };

  const handleUndo = async () => {
    try {
      // Remove tiers from successfully updated products
      for (const productId of processingResults.successful) {
        await supabase
          .from('product_discount_tiers')
          .delete()
          .eq('product_id', productId);

        await supabase
          .from('products')
          .update({ group_order_enabled: false })
          .eq('id', productId);
      }

      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-tiers-bulk'] });

      toast({
        title: "Changes Undone",
        description: "All tier configurations have been removed"
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Undo Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const renderConfigureStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Configure Tier Discounts</h3>
        <p className="text-sm text-gray-600">
          Set up discount tiers for {selectedProductIds.length} selected products
        </p>
      </div>

      {/* Product Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">New Tiers</span>
            </div>
            <div className="text-2xl font-bold">{productsWithoutTiers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">Will be Updated</span>
            </div>
            <div className="text-2xl font-bold">{productsWithTiers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Warning about existing tiers */}
      {productsWithTiers.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Warning:</strong> {productsWithTiers.length} product(s) already have tier discounts. 
            Their existing tiers will be completely replaced with the new configuration.
          </AlertDescription>
        </Alert>
      )}

      {/* Tier Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Discount Tiers</Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addTier}
            disabled={tiers.length >= 3}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Tier
          </Button>
        </div>

        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <Badge variant="outline" className="min-w-fit">
                Tier {index + 1}
              </Badge>
              
              <div className="flex-1">
                <Label className="text-xs">Members Required</Label>
                <Input
                  type="number"
                  min="3"
                  max="1000"
                  value={tier.members_required || ''}
                  onChange={(e) => updateTier(index, 'members_required', parseInt(e.target.value) || 0)}
                  placeholder="e.g. 10"
                  className="mt-1"
                />
              </div>
              
              <div className="flex-1">
                <Label className="text-xs">Discount %</Label>
                <Input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={tier.discount_percentage || ''}
                  onChange={(e) => updateTier(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 15"
                  className="mt-1"
                />
              </div>
              
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeTier(index)}
                className="mt-5"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={() => setStep('confirm')} 
          className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
          disabled={tiers.length === 0 || !tiers.some(t => t.members_required > 0 && t.discount_percentage > 0)}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Confirm Configuration</h3>
        <p className="text-sm text-gray-600">
          Review your tier settings before applying to products
        </p>
      </div>

      {/* Tier Summary */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Tier Configuration</Label>
        {tiers.filter(t => t.members_required > 0 && t.discount_percentage > 0).map((tier, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-pink-600" />
              <span className="font-medium">Tier {index + 1}</span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{tier.members_required}+ members</span> → 
              <span className="font-bold text-pink-600 ml-1">{tier.discount_percentage}% off</span>
            </div>
          </div>
        ))}
      </div>

      {/* Product Summary */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Products to Update</Label>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {productsInfo.map(product => (
            <div key={product.id} className={`flex items-center gap-3 p-2 rounded ${
              product.hasTiers ? 'bg-orange-50' : 'bg-green-50'
            }`}>
              {product.hasTiers ? (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <img 
                src={product.image_url || 'https://via.placeholder.com/40'} 
                alt={product.name}
                className="w-8 h-8 rounded object-cover"
              />
              <span className="text-sm font-medium">{product.name}</span>
              <span className="text-sm text-gray-500 ml-auto">₹{product.price}</span>
              {product.hasTiers && (
                <span className="text-xs text-orange-600 ml-2">Will be updated</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setStep('configure')} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleApply}
          className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
        >
          Apply to {totalProducts} Products
        </Button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      <h3 className="text-lg font-semibold">Applying Tier Discounts</h3>
      <p className="text-sm text-gray-600 text-center">
        Please wait while we update your products...
      </p>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Update Complete</h3>
        <p className="text-sm text-gray-600">
          Here's a summary of the bulk tier discount update
        </p>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{processingResults.successful.length}</div>
            <div className="text-sm text-gray-600">Updated</div>
          </CardContent>
        </Card>
        
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{processingResults.failed.length}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Products Details */}
      {processingResults.failed.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base font-semibold text-red-600">Failed Updates</Label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {processingResults.failed.map(({ productId, error }) => {
              const product = productsInfo.find(p => p.id === productId);
              return (
                <div key={productId} className="p-2 bg-red-50 rounded text-sm">
                  <div className="font-medium">{product?.name || productId}</div>
                  <div className="text-red-600 text-xs">{error}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {processingResults.successful.length > 0 && (
          <Button 
            variant="outline" 
            onClick={handleUndo}
            className="flex items-center gap-2"
          >
            <Undo2 className="w-4 h-4" />
            Undo Changes
          </Button>
        )}
        <Button onClick={onSuccess} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-500" />
            Bulk Tier Discounts
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'configure' && renderConfigureStep()}
            {step === 'confirm' && renderConfirmStep()}
            {step === 'processing' && renderProcessingStep()}
            {step === 'results' && renderResultsStep()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDiscountModal; 