import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const skip = page * limit;

    let where: any = { isActive: true };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

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
      category,
      stockQuantity,
      isActive,
      groupOrderEnabled,
      images,
      categories,
      discountTiers,
    } = body;

    const product = await prisma.product.create({
      data: {
        vendorId: user.id,
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        category,
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
        categories: categories
          ? {
              create: categories.map((catId: string) => ({
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

