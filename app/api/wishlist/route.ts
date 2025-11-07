import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const user = await requireAuth();

    if (productId) {
      const item = await prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId: user.id,
            productId,
          },
        },
      });
      return ApiResponseHandler.success({ exists: !!item }, "Wishlist status fetched successfully");
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: "asc" },
              take: 1,
            },
            vendor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const processed = items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        image_url: item.product.images[0]?.imageUrl || item.product.imageUrl,
      },
    }));

    return ApiResponseHandler.success({ items: processed }, "Wishlist fetched successfully");
  } catch (error: any) {
    console.error("Wishlist GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch wishlist", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { productId } = body;

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    });

    if (existing) {
      return ApiResponseHandler.badRequest("Already in wishlist");
    }

    const item = await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        productId,
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    return ApiResponseHandler.created({ item }, "Item added to wishlist successfully");
  } catch (error: any) {
    console.error("Wishlist POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to add to wishlist", 500, error);
  }
}

