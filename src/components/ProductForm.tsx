import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react'; // Assuming lucide-react for icons, install if needed
import CategoryDropdown from './CategoryDropdown';

interface ProductFormProps {
  onClose: () => void;
  existingData?: any;
}

interface DiscountTier {
  members_required: number;
  discount_percentage: number;
}

interface ProductImage {
  id?: string;
  file?: File;
  url?: string;
  preview?: string;
  isPrimary: boolean;
  displayOrder: number;
}

const ProductForm: React.FC<ProductFormProps> = ({ onClose, existingData }) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    name: existingData?.name || '',
    description: existingData?.description || '',
    price: existingData?.price || '',
    stock_quantity: existingData?.stock_quantity || '',
    is_active: existingData ? existingData.is_active : true,
  });
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch KYC data to verify vendor can add products
  const { data: kycData, isLoading: isKYCLoading } = useQuery({
    queryKey: ['kyc', user?.id],
    queryFn: async () => {
      if (!user?.id || profile?.role !== 'vendor') return null;

      const { data, error } = await supabase
        .from('vendor_kyc')
        .select('*')
        .eq('vendor_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && profile?.role === 'vendor',
  });

  // Fetch existing product images if editing a product
  const { data: existingImages } = useQuery({
    queryKey: ['product-images', existingData?.id],
    queryFn: async () => {
      if (!existingData?.id) return [];
      
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', existingData.id)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!existingData?.id,
  });

  // Fetch existing discount tiers if editing a product
  const { data: discountTiers } = useQuery({
    queryKey: ['product-tiers', existingData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_discount_tiers')
        .select('*')
        .eq('product_id', existingData.id)
        .order('tier_number');

      if (error) throw error;
      return data;
    },
    enabled: !!existingData?.id,
  });

  // Fetch existing product categories if editing a product
  const { data: existingCategories } = useQuery({
    queryKey: ['product-categories', existingData?.id],
    queryFn: async () => {
      if (!existingData?.id) return [];
      
      const { data, error } = await supabase
        .from('product_category_mappings')
        .select(`
          product_categories!inner(name)
        `)
        .eq('product_id', existingData.id);

      if (error) throw error;
      return data?.map((item: any) => item.product_categories.name) || [];
    },
    enabled: !!existingData?.id,
  });

  // Set initial product images from fetched data
  useEffect(() => {
    if (existingImages) {
      setProductImages(
        existingImages.map((img: any) => ({
          id: img.id,
          url: img.image_url,
          preview: img.image_url,
          isPrimary: img.is_primary,
          displayOrder: img.display_order,
        }))
      );
    }
  }, [existingImages]);

  // Set initial tiers from fetched data
  useEffect(() => {
    if (discountTiers) {
      setTiers(
        discountTiers.map((tier: any) => ({
          members_required: tier.members_required,
          discount_percentage: tier.discount_percentage,
        }))
      );
    }
  }, [discountTiers]);

  // Set initial categories from fetched data
  useEffect(() => {
    if (existingCategories) {
      setSelectedCategories(existingCategories);
    }
  }, [existingCategories]);

  // Check if vendor is approved to add products
  const isKYCApproved = kycData?.status === 'approved';
  const isVendor = profile?.role === 'vendor';

  // Redirect if vendor is not approved
  useEffect(() => {
    if (!isKYCLoading && isVendor && !isKYCApproved) {
      toast({
        title: "KYC Verification Required",
        description: "Please complete your KYC verification to add products.",
        variant: "destructive"
      });
      onClose();
      navigate('/products');
    }
  }, [isKYCLoading, isVendor, isKYCApproved, onClose, navigate, toast]);

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      
      setProductImages(prev => {
        const newImages = [...prev];
        if (newImages[index]) {
          newImages[index] = { ...newImages[index], file, preview };
        } else {
          newImages[index] = { 
            file, 
            preview, 
            isPrimary: index === 0, 
            displayOrder: index 
          };
        }
        return newImages;
      });
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);
    
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);
    
    return publicUrl;
  };

  const removeImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    setProductImages(prev => 
      prev.map((img, i) => ({ 
        ...img, 
        isPrimary: i === index 
      }))
    );
  };

  const addTier = () => {
    setTiers((prev) => [...prev, { members_required: 0, discount_percentage: 0 }]);
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof DiscountTier, value: number) => {
    setTiers((prev) =>
      prev.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      )
    );
  };

  const submitProductMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      const productData = {
        ...form,
        price: parseFloat(form.price as string),
        stock_quantity: parseInt(form.stock_quantity as string),
      };

      let productId: string;
      
      if (existingData) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', existingData.id);
        
        if (error) throw error;

        productId = existingData.id;

        // Delete existing product images
        const { error: deleteImagesError } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);

        if (deleteImagesError) throw deleteImagesError;

        // Delete existing tiers
        const { error: deleteError } = await supabase
          .from('product_discount_tiers')
          .delete()
          .eq('product_id', productId);

        if (deleteError) throw deleteError;
      } else {
        // Insert new product
        const { data: inserted, error } = await supabase
          .from('products')
          .insert({
            ...productData,
            vendor_id: profile.id,
          })
          .select();

        if (error) throw error;
        if (!inserted || inserted.length === 0) throw new Error('Failed to insert product');

        productId = inserted[0].id;
      }

      // Upload and insert product images
      const imagesToUpload = productImages.filter(img => img.file);
      const existingImages = productImages.filter(img => img.url && !img.file);

      if (imagesToUpload.length > 0) {
        const uploadPromises = imagesToUpload.map(async (img) => {
          const imageUrl = await uploadImage(img.file!);
          return {
            product_id: productId,
            image_url: imageUrl,
            display_order: img.displayOrder,
            is_primary: img.isPrimary,
          };
        });

        const uploadedImages = await Promise.all(uploadPromises);
        const validImages = uploadedImages.filter(img => img.image_url);

        if (validImages.length > 0) {
          const { error } = await supabase
            .from('product_images')
            .insert(validImages);

          if (error) throw error;
        }
      }

      // Insert existing images (for editing)
      if (existingImages.length > 0) {
        const existingImagesData = existingImages.map(img => ({
          product_id: productId,
          image_url: img.url!,
          display_order: img.displayOrder,
          is_primary: img.isPrimary,
        }));

        const { error } = await supabase
          .from('product_images')
          .insert(existingImagesData);

        if (error) throw error;
      }

      // Insert new tiers if any
      if (tiers.length > 0) {
        const tiersData = tiers.map((tier, index) => ({
          product_id: productId,
          tier_number: index + 1,
          members_required: tier.members_required,
          discount_percentage: tier.discount_percentage,
        }));

        const { error } = await supabase
          .from('product_discount_tiers')
          .insert(tiersData);
        
        if (error) throw error;
      }

      // Handle categories
      if (existingData) {
        // Delete existing category mappings
        const { error: deleteCategoriesError } = await supabase
          .from('product_category_mappings')
          .delete()
          .eq('product_id', productId);

        if (deleteCategoriesError) throw deleteCategoriesError;
      }

      // Insert new category mappings
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

      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['product-tiers', productId] });
      toast({
        title: existingData ? 'Product Updated' : 'Product Added',
        description: existingData 
          ? 'Your product has been updated successfully.' 
          : 'Your product has been added successfully.',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to ${existingData ? 'update' : 'add'} product. Please try again.`,
        variant: 'destructive',
      });
      console.error(error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitProductMutation.mutate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'number' ? (value ? parseFloat(value) : '') : value 
    }));
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full md:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existingData ? 'Edit Product' : 'Add New Product'}</SheetTitle>
          <SheetDescription>
            {existingData 
              ? 'Update your product details below.' 
              : 'Fill in the details for your new product.'}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input 
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Product Name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Product Description"
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input 
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="stock_quantity">Stock Quantity *</Label>
              <Input 
                id="stock_quantity"
                name="stock_quantity"
                type="number"
                min="0"
                step="1"
                value={form.stock_quantity}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>
          </div>
          
          <div>
            <Label>Categories</Label>
            <CategoryDropdown
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label>Product Images (Up to 3)</Label>
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`product_image_${index}`} className="text-sm">
                      Image {index + 1} {index === 0 && '(Primary)'}
                    </Label>
                    {productImages[index] && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryImage(index)}
                        className={productImages[index]?.isPrimary ? 'bg-green-100 text-green-700' : ''}
                      >
                        {productImages[index]?.isPrimary ? 'Primary' : 'Set Primary'}
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
            <Input 
                      id={`product_image_${index}`}
              type="file"
              accept="image/*"
                      onChange={(e) => handleImageChange(index, e)}
                      className="flex-1"
            />
                    {productImages[index] && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  {productImages[index]?.preview && (
              <div className="mt-2">
                <img 
                        src={productImages[index].preview} 
                        alt={`Product Image ${index + 1}`} 
                        className="w-full max-h-32 object-contain rounded border"
                />
              </div>
            )}
                </div>
              ))}
            </div>
          </div>

          {/* Discount Tiers UI - Placed beneath product image for layout flow */}
          <div className="space-y-4">
            <Label>Discount Tiers</Label>
            <div className="space-y-3">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-muted/50 p-3 rounded-md border border-border"
                >
                  <div className="w-full sm:w-auto flex-1">
                    <Label htmlFor={`members-${index}`} className="text-sm">Members Required</Label>
                    <Input
                      id={`members-${index}`}
                      type="number"
                      min="0"
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
                      min="0"
                      max="100"
                      step="0.01"
                      value={tier.discount_percentage || ''}
                      onChange={(e) => updateTier(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 15"
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
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addTier} className="w-full sm:w-auto">
              Add Tier
            </Button>
          </div>
          
          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : existingData ? 'Update Product' : 'Add Product'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default ProductForm;
