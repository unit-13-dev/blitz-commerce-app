import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Upload, AlertCircle, Package, Trash2, Plus, Users, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import CategoryDropdown from "@/components/CategoryDropdown";

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  image_url: string;
  group_order_enabled: boolean;
}

interface DiscountTier {
  id?: string;
  tier_number?: number;
  members_required: number;
  discount_percentage: number;
}

interface ValidationErrors {
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  stock_quantity?: string;
}

const EditProduct = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock_quantity: 0,
    is_active: true,
    image_url: '',
    group_order_enabled: false,
  });
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Tiered Discount State
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [groupOrderStats, setGroupOrderStats] = useState<{
    activeOrders: number;
    totalOrders: number;
    lastModified: string | null;
  }>({ activeOrders: 0, totalOrders: 0, lastModified: null });

  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('vendor_id', user?.id) // Ensure user owns the product
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!user?.id,
  });

  // Fetch existing discount tiers
  const { data: discountTiers } = useQuery({
    queryKey: ['product-tiers', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_discount_tiers')
        .select('*')
        .eq('product_id', productId)
        .order('tier_number');

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Fetch existing product categories
  const { data: existingCategories } = useQuery({
    queryKey: ['product-categories', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_category_mappings')
        .select(`
          product_categories!inner(name)
        `)
        .eq('product_id', productId);

      if (error) throw error;
      return data?.map((item: any) => item.product_categories.name) || [];
    },
    enabled: !!productId,
  });

  // TODO: Implement group order statistics query
  // For now, we'll use placeholder data
  const groupStats = { activeOrders: 0, totalOrders: 0 };

  // Initialize form when product loads
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        category: product.category || '',
        stock_quantity: product.stock_quantity === 0 ? '' : product.stock_quantity || '',
        is_active: product.is_active ?? true,
        image_url: product.image_url || '',
        group_order_enabled: (product as any).group_order_enabled ?? false,
      });
    }
  }, [product]);

  // Initialize tiers from fetched data
  useEffect(() => {
    if (discountTiers) {
      setTiers(
        discountTiers.map((tier: any) => ({
          id: tier.id,
          tier_number: tier.tier_number,
          members_required: tier.members_required,
          discount_percentage: tier.discount_percentage,
        }))
      );
    }
  }, [discountTiers]);

  // Auto-toggle group_order_enabled based on tiers
  useEffect(() => {
    const hasValidTiers = tiers.length > 0 && tiers.every(tier => 
      tier.members_required > 0 && tier.discount_percentage > 0
    );
    
    setFormData(prev => ({
      ...prev,
      group_order_enabled: hasValidTiers
    }));
  }, [tiers]);

  // Set initial categories when existing categories are loaded
  useEffect(() => {
    if (existingCategories) {
      setSelectedCategories(existingCategories);
    }
  }, [existingCategories]);

  // Tier management functions
  const addTier = () => {
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

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    } else if (formData.price > 1000000) {
      newErrors.price = 'Price cannot exceed ₹10,00,000';
    }

    if (formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative';
    } else if (formData.stock_quantity > 10000) {
      newErrors.stock_quantity = 'Stock quantity cannot exceed 10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (updatedData: ProductFormData) => {
      if (!productId) throw new Error('Product ID is required');
      
      // Update product data
      const { error: productError } = await supabase
        .from('products')
        .update({
          ...updatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .eq('vendor_id', user?.id);
      
      if (productError) throw productError;

      // Handle tier updates
      // First, delete all existing tiers for this product
      const { error: deleteError } = await supabase
        .from('product_discount_tiers')
        .delete()
        .eq('product_id', productId);

      if (deleteError) throw deleteError;

      // Insert new tiers if any exist and are valid
      if (tiers.length > 0) {
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
        }
      }

      // Handle categories
      // First, delete all existing category mappings for this product
      const { error: deleteCategoriesError } = await supabase
        .from('product_category_mappings')
        .delete()
        .eq('product_id', productId);

      if (deleteCategoriesError) throw deleteCategoriesError;

      // Insert new category mappings if any exist
      if (selectedCategories.length > 0) {
        // Get category IDs for selected category names
        const { data: categoryData, error: categoryError } = await supabase
          .from('product_categories')
          .select('id, name')
          .in('name', selectedCategories);

        if (categoryError) throw categoryError;

        const categoryMappings = categoryData.map(category => ({
          product_id: productId,
          category_id: category.id,
        }));

        const { error: insertCategoriesError } = await supabase
          .from('product_category_mappings')
          .insert(categoryMappings);

        if (insertCategoriesError) throw insertCategoriesError;
      } else {
        // Default to "Others" category if no categories selected
        const { data: othersCategory, error: othersError } = await supabase
          .from('product_categories')
          .select('id')
          .eq('name', 'Others')
          .single();

        if (othersError) throw othersError;

        const { error: insertOthersError } = await supabase
          .from('product_category_mappings')
          .insert({
            product_id: productId,
            category_id: othersCategory.id,
          });

        if (insertOthersError) throw insertOthersError;
      }
    },
    onSuccess: () => {
      toast({ title: "Product updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-tiers', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-categories', productId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      navigate(`/users/${user?.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating product", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('vendor_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Product deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-stats'] });
      navigate(`/users/${user?.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting product", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors below",
        variant: "destructive"
      });
      return;
    }

    updateProductMutation.mutate(formData);
  };

  // Handle delete confirmation
  const handleDelete = () => {
    setShowDeleteDialog(false);
    deleteProductMutation.mutate();
  };

  // Handle input changes
  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${productId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({ title: "Image uploaded successfully!" });
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center mt-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center mt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
            <p className="text-gray-600 mb-4">You can only edit your own products.</p>
            <Button onClick={() => navigate(`/users/${user.id}`)}>
              Go Back to Profile
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/users/${user.id}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-pink-600" />
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          </div>
          <p className="text-gray-600 mt-2">Update your product information and details</p>
        </motion.div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Product Details</CardTitle>
                {/* Delete Button - Moved to header for better UX */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleteProductMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-3"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Image */}
                <div className="space-y-2">
                  <Label htmlFor="image">Product Image</Label>
                  <div className="flex flex-col gap-4">
                    {formData.image_url && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={formData.image_url}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter product name"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <CategoryDropdown
                    selectedCategories={selectedCategories}
                    onCategoriesChange={setSelectedCategories}
                    disabled={updateProductMutation.isPending}
                  />
                  {errors.category && (
                    <div className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category}
                    </div>
                  )}
                </div>

                {/* Price and Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={errors.price ? 'border-red-500' : ''}
                    />
                    {errors.price && (
                      <div className="flex items-center gap-1 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {errors.price}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={errors.stock_quantity ? 'border-red-500' : ''}
                    />
                    {errors.stock_quantity && (
                      <div className="flex items-center gap-1 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {errors.stock_quantity}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your product in detail..."
                    rows={4}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <div className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {errors.description}
                    </div>
                  )}
                </div>

                {/* Tiered Discount Section */}
                <div className="space-y-4">
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-lg font-semibold">Group Order Discount Tiers</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          Set up tiered discounts to enable group ordering for this product
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          formData.group_order_enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {formData.group_order_enabled ? 'Group Orders Enabled' : 'Group Orders Disabled'}
                        </div>
                      </div>
                    </div>

                    {/* Group Order Stats & Warnings */}
                    {(groupStats.activeOrders > 0 || groupStats.totalOrders > 0) && (
                      <Alert className="mb-4 border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <div className="space-y-2">
                            <p className="font-medium">Impact on Active Orders:</p>
                            <div className="flex gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {groupStats.activeOrders} active group orders
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {groupStats.totalOrders} total orders
                              </span>
                            </div>
                            <p className="text-xs">
                              Changes to discount tiers will not affect existing group orders.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Existing Context Info */}
                    {discountTiers && discountTiers.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-blue-800 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Current Configuration:</span>
                          <span>{discountTiers.length} tier(s) active</span>
                        </div>
                      </div>
                    )}

                    {/* Tier List */}
                    <div className="space-y-3">
                      {tiers.map((tier, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-gray-50 p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-[80px]">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              Tier {index + 1}
                            </span>
                          </div>
                          
                          <div className="w-full sm:w-auto flex-1">
                            <Label htmlFor={`members-${index}`} className="text-sm">Members Required</Label>
                            <Input
                              id={`members-${index}`}
                              type="number"
                              min="3"
                              max="1000"
                              value={tier.members_required || ''}
                              onChange={(e) => updateTier(index, 'members_required', parseInt(e.target.value) || 0)}
                              placeholder="e.g. 10"
                              className="mt-1"
                            />
                          </div>
                          
                          <div className="w-full sm:w-auto flex-1">
                            <Label htmlFor={`discount-${index}`} className="text-sm">Discount %</Label>
                            <Input
                              id={`discount-${index}`}
                              type="number"
                              min="0.01"
                              max="100"
                              step="0.01"
                              value={tier.discount_percentage || ''}
                              onChange={(e) => updateTier(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                              placeholder="e.g. 15.5"
                              className="mt-1"
                            />
                          </div>
                          
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="mt-6 sm:mt-0 flex-shrink-0"
                            onClick={() => removeTier(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>

                    {/* Add Tier Button */}
                    <div className="flex items-center justify-between pt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={addTier} 
                        className="flex items-center gap-2"
                        disabled={tiers.length >= 3} // Limit to 3 tiers as specified
                      >
                        <Plus className="w-4 h-4" />
                        Add Tier {tiers.length < 3 ? `(₹{3 - tiers.length} remaining)` : '(Max reached)'}
                      </Button>
                      
                      {tiers.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Max discount: {Math.max(...tiers.map(t => t.discount_percentage))}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Helper Text */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
                      <div className="text-sm text-gray-700 space-y-1">
                        <p className="font-medium">How it works:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                          <li>Customers can create group orders when tiers are configured</li>
                          <li>Higher member counts unlock better discounts automatically</li>
                          <li>Group orders use the highest applicable discount tier</li>
                          <li>Removing all tiers disables group ordering for this product</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="active">Product Status</Label>
                    <p className="text-sm text-gray-600">
                      {formData.is_active ? 'Product is active and visible to customers' : 'Product is inactive and hidden from customers'}
                    </p>
                  </div>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                </div>

                {/* Action Buttons - Improved UX Layout */}
                <div className="pt-6 border-t">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Cancel Button - Secondary Action */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="order-2 sm:order-1 sm:w-auto min-w-[120px]"
                    >
                      Cancel
                    </Button>
                    
                    {/* Save Button - Primary Action */}
                    <Button
                      type="submit"
                      disabled={updateProductMutation.isPending}
                      className="order-1 sm:order-2 flex-1 bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-600 hover:to-emerald-500 min-h-[44px] font-medium"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProductMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                  
                  {/* Helper Text */}
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Changes will be saved to your product listing
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md"
            >
            <Card className="bg-white shadow-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Delete Product</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    Are you sure you want to delete "<strong>{formData.name}</strong>"? 
                    This will permanently remove the product from your store and cannot be undone.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                    className="flex-1"
                    disabled={deleteProductMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteProductMutation.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteProductMutation.isPending ? 'Deleting...' : 'Delete Product'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default EditProduct; 