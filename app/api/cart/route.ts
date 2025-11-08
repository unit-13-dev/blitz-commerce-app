import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const cartItems = await prisma.cartItem.findMany({
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

    const items = cartItems.map((item) => ({
      ...item,
      product: {
        ...item.product,
        image_url: item.product.images[0]?.imageUrl || item.product.imageUrl,
        vendor_profile: item.product.vendor,
      },
    }));

    return ApiResponseHandler.success({ items }, "Cart fetched successfully");
  } catch (error: any) {
    console.error("Cart GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch cart", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { productId, quantity = 1 } = body;

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    });

    let item;
    if (existingItem) {
      item = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
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
    } else {
      item = await prisma.cartItem.create({
        data: {
          userId: user.id,
          productId,
          quantity,
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
    }

    return ApiResponseHandler.created({ item }, "Item added to cart successfully");
  } catch (error: any) {
    console.error("Cart POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to add to cart", 500, error);
  }
}

