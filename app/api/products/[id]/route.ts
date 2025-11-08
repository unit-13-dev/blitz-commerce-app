import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { validateCategory } from "@/lib/product-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        images: {
          orderBy: { displayOrder: "asc" },
        },
        categories: {
          include: {
            category: true,
          },
        },
        discountTiers: {
          orderBy: { tierNumber: "asc" },
        },
      },
    });

    if (!product) {
      return ApiResponseHandler.notFound("Product not found");
    }

    return ApiResponseHandler.success({ product }, "Product fetched successfully");
  } catch (error: any) {
    console.error("Product GET error", error);
    return ApiResponseHandler.error("Failed to fetch product", 500, error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);
    
    if (!user) {
      return ApiResponseHandler.unauthorized();
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return ApiResponseHandler.notFound("Product not found");
    }

    // Check ownership or admin
    if (product.vendorId !== user.id && user.role !== "admin") {
      return ApiResponseHandler.forbidden("You can only update your own products");
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      imageUrl,
      category, // Enum category (single)
      stockQuantity,
      isActive,
      groupOrderEnabled,
      isReturnable,
      isReplaceable,
      images,
      categories, // Dynamic categories (array of category IDs)
    } = body;

    // Validate returnable/replaceable if provided
    if (isReturnable !== undefined && isReplaceable !== undefined) {
      if (!isReturnable && !isReplaceable) {
        return ApiResponseHandler.badRequest("At least one option must be selected: isReturnable or isReplaceable");
      }
    }

    // Validate and convert enum category if provided (optional)
    let validatedCategory = undefined;
    let enumCategoryValue: string | null = null;
    let dynamicCategoryIds: string[] = [];

    if (category !== undefined) {
      if (category === null || category === "") {
        validatedCategory = null;
      } else {
        try {
          validatedCategory = validateCategory(category);
        } catch (error: any) {
          return ApiResponseHandler.badRequest(error.message);
        }
      }
    }

    // Validate categories array if provided (optional)
    if (categories && Array.isArray(categories)) {
      if (categories.length === 0) {
        // Empty array means clear all categories
        dynamicCategoryIds = [];
      } else {
        // UUID pattern for dynamic categories (8-4-4-4-12 hexadecimal characters)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        for (const cat of categories) {
          if (typeof cat !== 'string') {
            continue; // Skip invalid entries
          }

          // Check if it's a UUID (dynamic category)
          if (uuidPattern.test(cat)) {
            dynamicCategoryIds.push(cat);
            continue;
          }

          // Check if it's a valid enum category
          try {
            const validated = validateCategory(cat);
            if (validated) {
              // If it's a valid enum category, use it as the primary category
              // Only one enum category allowed, so take the first one found
              if (!enumCategoryValue) {
                enumCategoryValue = validated;
              }
            }
          } catch {
            // Not a valid enum category, but also not a UUID
            // This might be an invalid category ID, but we'll include it anyway
            console.warn(`Unknown category format: ${cat}`);
          }
        }
      }
    }

    // Use enum category from either the category field or from categories array
    const finalEnumCategory = validatedCategory !== undefined ? validatedCategory : (enumCategoryValue || undefined);

    // Delete old images if new ones provided
    if (images) {
      await prisma.productImage.deleteMany({
        where: { productId: id },
      });
    }

    // Delete old category mappings if new ones provided
    if (categories !== undefined) {
      await prisma.productCategoryMapping.deleteMany({
        where: { productId: id },
      });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        imageUrl,
        category: finalEnumCategory as any, // Cast to enum type
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        groupOrderEnabled: groupOrderEnabled !== undefined ? groupOrderEnabled : undefined,
        isReturnable: isReturnable !== undefined ? isReturnable : undefined,
        isReplaceable: isReplaceable !== undefined ? isReplaceable : undefined,
        images: images
          ? {
              create: images.map((img: any, index: number) => ({
                imageUrl: img.url,
                displayOrder: index,
                isPrimary: index === 0,
              })),
            }
          : undefined,
        categories: dynamicCategoryIds.length > 0
          ? {
              create: dynamicCategoryIds.map((catId: string) => ({
                category: { connect: { id: catId } },
              })),
            }
          : categories !== undefined && dynamicCategoryIds.length === 0
          ? { set: [] } // Clear all categories if empty array provided
          : undefined,
      },
      include: {
        vendor: true,
        images: true,
        categories: { include: { category: true } },
      },
    });

    return ApiResponseHandler.success({ product: updated }, "Product updated successfully");
  } catch (error: any) {
    console.error("Product PUT error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to update product", 500, error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return ApiResponseHandler.unauthorized();
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return ApiResponseHandler.notFound("Product not found");
    }

    if (product.vendorId !== user.id && user.role !== "admin") {
      return ApiResponseHandler.forbidden("You can only delete your own products");
    }

    await prisma.product.delete({
      where: { id },
    });

    return ApiResponseHandler.success({ message: "Product deleted" }, "Product deleted successfully");
  } catch (error: any) {
    console.error("Product DELETE error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to delete product", 500, error);
  }
}

