import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireAuth();
    const isAdmin = user.role === "admin";

    const orders = await prisma.order.findMany({
      where: isAdmin ? {} : { userId: user.id },
      include: {
        items: {
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
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ApiResponseHandler.success({ orders }, "Orders fetched successfully");
  } catch (error: any) {
    console.error("Orders GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch orders", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      items,
      shippingAddressId,
      shippingAddressText,
      paymentMethod,
      shippingAmount,
      notes,
    } = body;

    // Get cart items if not provided
    const cartItems = items
      ? items
      : await prisma.cartItem.findMany({
          where: { userId: user.id },
          include: { product: true },
        });

    if (cartItems.length === 0) {
      return ApiResponseHandler.badRequest("Cart is empty");
    }

    // Calculate total
    const totalAmount = cartItems.reduce((sum: number, item: any) => {
      const price = typeof item.product.price === "string" 
        ? parseFloat(item.product.price) 
        : Number(item.product.price);
      const qty = item.quantity || 1;
      return sum + price * qty;
    }, 0);

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderNumber,
        totalAmount,
        shippingAmount: shippingAmount || 0,
        shippingAddressId,
        shippingAddressText,
        paymentMethod: paymentMethod || "online",
        paymentStatus: "pending",
        status: "pending",
        notes,
        items: {
          create: cartItems.map((item: any) => {
            const price = typeof item.product.price === "string"
              ? parseFloat(item.product.price)
              : Number(item.product.price);
            const qty = item.quantity || 1;
            return {
              productId: item.productId,
              productName: item.product.name,
              productImageUrl: item.product.imageUrl,
              quantity: qty,
              unitPrice: price,
              totalPrice: price * qty,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { userId: user.id },
    });

    return ApiResponseHandler.created({ order }, "Order created successfully");
  } catch (error: any) {
    console.error("Order POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to create order", 500, error);
  }
}

