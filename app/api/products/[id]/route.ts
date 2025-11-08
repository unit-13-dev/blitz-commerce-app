import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

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
      category,
      stockQuantity,
      isActive,
      groupOrderEnabled,
      images,
      categories,
    } = body;

    // Delete old images if new ones provided
    if (images) {
      await prisma.productImage.deleteMany({
        where: { productId: id },
      });
    }

    // Delete old category mappings if new ones provided
    if (categories) {
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
        category,
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
        isActive,
        groupOrderEnabled,
        images: images
          ? {
              create: images.map((img: any, index: number) => ({
                imageUrl: img.url,
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

