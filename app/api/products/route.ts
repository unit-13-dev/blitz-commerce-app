import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { validateCategory } from "@/lib/product-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const categoryEnum = searchParams.get("category"); // Filter by enum category
    const skip = page * limit;

    let where: any = { isActive: true };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Filter by enum category if provided
    if (categoryEnum && categoryEnum !== "all") {
      try {
        const validatedCategory = validateCategory(categoryEnum);
        if (validatedCategory) {
          where.category = validatedCategory;
        }
      } catch (error) {
        // Invalid category enum, ignore it
        console.warn(`Invalid category enum: ${categoryEnum}`);
      }
    }

    // Filter by dynamic category (ProductCategory table) if provided
    if (categoryId && categoryId !== "all") {
      const productIds = await prisma.productCategoryMapping.findMany({
        where: { categoryId },
        select: { productId: true },
      });
      where.id = { in: productIds.map((p) => p.productId) };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
            take: 1,
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const processedProducts = products.map((product) => ({
      ...product,
      image_url: product.images[0]?.imageUrl || product.imageUrl,
      vendor_profile: product.vendor,
    }));

    return ApiResponseHandler.paginated(processedProducts, total, page, limit, "Products fetched successfully");
  } catch (error: any) {
    console.error("Products GET error", error);
    return ApiResponseHandler.error("Failed to fetch products", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return ApiResponseHandler.unauthorized();
    }

    // Verify user is a vendor or admin
    if (user.role !== "vendor" && user.role !== "admin") {
      return ApiResponseHandler.forbidden("Only vendors can create products");
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
      images,
      categories, // Dynamic categories (array of category IDs)
      discountTiers,
    } = body;

    // Validate and convert enum category if provided (optional)
    let validatedCategory = null;
    if (category) {
      try {
        validatedCategory = validateCategory(category);
      } catch (error: any) {
        return ApiResponseHandler.badRequest(error.message);
      }
    }

    // Validate categories array if provided (optional)
    // Categories can be either enum category IDs (strings like "electronics") or dynamic category IDs (UUIDs)
    // We'll filter them when creating the relationships
    let dynamicCategoryIds: string[] = [];
    let enumCategoryValue: string | null = null;

    if (categories && Array.isArray(categories) && categories.length > 0) {
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
          // The database will handle the error if it's invalid
          console.warn(`Unknown category format: ${cat}`);
        }
      }
    }

    // Use enum category from either the category field or from categories array
    const finalEnumCategory = validatedCategory || enumCategoryValue;

    const product = await prisma.product.create({
      data: {
        vendorId: user.id,
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        category: finalEnumCategory as any, // Cast to enum type
        stockQuantity: parseInt(stockQuantity) || 0,
        isActive: isActive !== false,
        groupOrderEnabled: groupOrderEnabled || false,
        images: images
          ? {
              create: images.map((img: any, index: number) => ({
                imageUrl: img.url || img,
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
          : undefined,
        discountTiers: discountTiers
          ? {
              create: discountTiers.map((tier: any) => ({
                tierNumber: tier.tierNumber,
                membersRequired: tier.membersRequired,
                discountPercentage: tier.discountPercentage,
              })),
            }
          : undefined,
      },
      include: {
        vendor: true,
        images: true,
        categories: { include: { category: true } },
      },
    });

    return ApiResponseHandler.created({ product }, "Product created successfully");
  } catch (error: any) {
    console.error("Product POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to create product", 500, error);
  }
}

