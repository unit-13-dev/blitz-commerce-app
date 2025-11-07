"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import CategoryDropdown from './CategoryDropdown';
import { apiClient } from '@/lib/api-client';
import { Switch } from '@/components/ui/switch';

interface ProductFormProps {
  onClose: () => void;
  existingData?: { id: string } | null;
}

interface DiscountTier {
  membersRequired: number;
  discountPercentage: number;
}

interface ProductImageState {
  id?: string;
  file?: File;
  url?: string;
  preview?: string;
  isPrimary: boolean;
  displayOrder: number;
}

const DEFAULT_FORM = {
  name: '',
  description: '',
  price: '',
  stockQuantity: '',
  isActive: true,
  groupOrderEnabled: false,
};

const ProductForm: React.FC<ProductFormProps> = ({ onClose, existingData }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [productImages, setProductImages] = useState<ProductImageState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/products/categories');
      return data?.categories || [];
    },
  });

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categoriesData.forEach((category: any) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categoriesData]);

  const { data: productDetail } = useQuery({
    queryKey: ['product-detail', existingData?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${existingData?.id}`);
      return data.product;
    },
    enabled: !!existingData?.id,
  });

  useEffect(() => {
    if (!productDetail) return;

    setForm({
      name: productDetail.name || '',
      description: productDetail.description || '',
      price: productDetail.price?.toString() || '',
      stockQuantity: productDetail.stockQuantity?.toString() || '',
      isActive: productDetail.isActive ?? true,
      groupOrderEnabled: productDetail.groupOrderEnabled ?? false,
    });

    if (productDetail.categories) {
      setSelectedCategories(
        productDetail.categories.map((mapping: any) => mapping.categoryId)
      );
    }

    if (productDetail.discountTiers) {
      setTiers(
        productDetail.discountTiers.map((tier: any) => ({
          membersRequired: tier.membersRequired,
          discountPercentage: tier.discountPercentage,
        }))
      );
    }

    if (productDetail.images) {
      setProductImages(
        productDetail.images
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
          .map((img: any, index: number) => ({
            id: img.id,
            url: img.imageUrl,
            preview: img.imageUrl,
            isPrimary: img.isPrimary ?? index === 0,
            displayOrder: index,
          }))
      );
    }
  }, [productDetail]);

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = event.target;

    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleToggleChange = (name: 'isActive' | 'groupOrderEnabled') =>
    (value: boolean) => {
      setForm((prev) => ({ ...prev, [name]: value }));
    };

  const handleImageChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    const preview = URL.createObjectURL(file);

    setProductImages((prev) => {
      const next = [...prev];
      const existing = next[index];
      const base: ProductImageState = {
        file,
        preview,
        isPrimary: existing ? existing.isPrimary : index === 0,
        displayOrder: index,
      };

      next[index] = { ...existing, ...base };
      return next;
    });
  };

  const removeImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    setProductImages((prev) =>
      prev.map((image, i) => ({
        ...image,
        isPrimary: i === index,
      }))
    );
  };

  const addTier = () => {
    setTiers((prev) => [...prev, { membersRequired: 0, discountPercentage: 0 }]);
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTier = (
    index: number,
    field: keyof DiscountTier,
    value: number
  ) => {
    setTiers((prev) =>
      prev.map((tier, i) =>
        i === index ? { ...tier, [field]: Number.isNaN(value) ? 0 : value } : tier
      )
    );
  };

  const uploadToCloudinary = async (file: File) => {
    const folder = `products/${profile?.id ?? 'shared'}`;
    const {
      data: { timestamp, signature, apiKey, cloudName },
    } = await apiClient.post('/media/signature', { folder });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('api_key', apiKey);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const json = await response.json();
    return json.secure_url as string;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) {
        throw new Error('Product name is required');
      }

      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price || '0'),
        stockQuantity: parseInt(form.stockQuantity || '0', 10) || 0,
        isActive: form.isActive,
        groupOrderEnabled: form.groupOrderEnabled,
        categories: selectedCategories,
        discountTiers: tiers.map((tier, index) => ({
          tierNumber: index + 1,
          membersRequired: tier.membersRequired,
          discountPercentage: tier.discountPercentage,
        })),
      } as any;

      const uploadedImages: ProductImageState[] = [];

      for (const image of productImages) {
        if (image.file) {
          const url = await uploadToCloudinary(image.file);
          uploadedImages.push({
            url,
            isPrimary: image.isPrimary,
            displayOrder: image.displayOrder,
          });
        } else if (image.url) {
          uploadedImages.push({
            url: image.url,
            isPrimary: image.isPrimary,
            displayOrder: image.displayOrder,
          });
        }
      }

      payload.images = uploadedImages.sort(
        (a, b) => a.displayOrder - b.displayOrder
      ).map((image, index) => ({
        url: image.url,
        isPrimary: index === 0 ? true : image.isPrimary,
      }));

      if (existingData?.id) {
        await apiClient.put(`/products/${existingData.id}`, payload);
        return existingData.id;
      }

      const { data } = await apiClient.post('/products', payload);
      return data?.product?.id as string;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-detail', productId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products', profile?.id] });

      toast({
        title: existingData ? 'Product updated' : 'Product created',
        description: existingData
          ? 'Your product has been updated successfully.'
          : 'Your product has been created successfully.',
      });

      onClose();
    },
    onError: (error: any) => {
      console.error('Product save error', error);
      toast({
        title: 'Error',
        description:
          error?.response?.data?.message || error.message || 'Failed to save product',
        variant: 'destructive',
      });
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    mutation.mutate();
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full md:max-w-2xl overflow-y-auto">
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
              onChange={handleFormChange}
              placeholder="Stylish handbag"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleFormChange}
              rows={4}
              placeholder="Add a short description for this product"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="stockQuantity">Stock Quantity *</Label>
              <Input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={handleFormChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isActive">Active</Label>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={handleToggleChange('isActive')}
                />
                <span className="text-sm text-muted-foreground">
                  Toggle to hide or show this product in the storefront.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupOrderEnabled">Enable group orders</Label>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  id="groupOrderEnabled"
                  checked={form.groupOrderEnabled}
                  onCheckedChange={handleToggleChange('groupOrderEnabled')}
                />
                <span className="text-sm text-muted-foreground">
                  Allow group ordering and community discounts for this product.
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Categories</Label>
            <CategoryDropdown
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />
            <p className="text-xs text-muted-foreground">
              Categories help customers discover your product.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Product Images</Label>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((index) => {
                const image = productImages[index];
                return (
                  <div key={index} className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageChange(index, event)}
                    />
                    {image?.preview && (
                      <div className="flex items-center gap-2">
                        <img
                          src={image.preview}
                          alt={`Preview ${index + 1}`}
                          className="h-16 w-16 rounded object-cover"
                        />
                        <Button
                          type="button"
                          variant={image.isPrimary ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPrimaryImage(index)}
                        >
                          {image.isPrimary ? 'Primary' : 'Set Primary'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              The first image will be used as the primary display image.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Bulk Discount Tiers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTier}>
                Add tier
              </Button>
            </div>

            <div className="space-y-4">
              {tiers.map((tier, index) => (
                <div key={index} className="rounded-md border p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <Label>Members required</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tier.membersRequired}
                        onChange={(event) =>
                          updateTier(index, 'membersRequired', parseInt(event.target.value, 10))
                        }
                      />
                    </div>
                    <div>
                      <Label>Discount percentage</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={tier.discountPercentage}
                        onChange={(event) =>
                          updateTier(index, 'discountPercentage', parseFloat(event.target.value))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3"
                    onClick={() => removeTier(index)}
                  >
                    Remove tier
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                router.push('/products');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting
                ? 'Saving...'
                : existingData
                ? 'Update product'
                : 'Create product'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default ProductForm;
