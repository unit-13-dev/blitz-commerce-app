import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { OrderStatus } from "@prisma/client";

export async function GET(request: Request) {
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
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      items,
      shippingAddressId,
      shippingAddressText,
      paymentMethod,
      shippingAmount,
      notes,
    } = body;

    // Validate shipping address
    if (!shippingAddressText) {
      return ApiResponseHandler.badRequest("Shipping address is required");
    }

    // Validate address ID if provided
    if (shippingAddressId) {
      const address = await prisma.userAddress.findUnique({
        where: { id: shippingAddressId },
      });
      if (!address || address.userId !== user.id) {
        return ApiResponseHandler.badRequest("Invalid shipping address");
      }
    }

    // Get cart items - fetch from DB to ensure we have latest product data
    let cartItems;
    if (items && Array.isArray(items) && items.length > 0) {
      // If items provided, fetch products from DB to validate and get latest data
      const productIds = items.map((item: any) => item.productId || item.id);
      const dbCartItems = await prisma.cartItem.findMany({
        where: { 
          userId: user.id,
          productId: { in: productIds },
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

      // Match provided items with DB items
      cartItems = items.map((item: any) => {
        const dbItem = dbCartItems.find(
          (dbItem) => dbItem.productId === (item.productId || item.id)
        );
        if (!dbItem) {
          throw new Error(`Product ${item.productId || item.id} not found in cart`);
        }
        return {
          ...dbItem,
          quantity: item.quantity || dbItem.quantity,
        };
      });
    } else {
      // Fetch all cart items from DB
      cartItems = await prisma.cartItem.findMany({
        where: { userId: user.id },
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

    if (cartItems.length === 0) {
      return ApiResponseHandler.badRequest("Cart is empty");
    }

    // Validate products - check availability and stock
    for (const item of cartItems) {
      if (!item.product.isActive) {
        return ApiResponseHandler.badRequest(`Product "${item.product.name}" is not available`);
      }
      if (item.product.stockQuantity < item.quantity) {
        return ApiResponseHandler.badRequest(
          `Insufficient stock for "${item.product.name}". Available: ${item.product.stockQuantity}, Requested: ${item.quantity}`
        );
      }
    }

    // Calculate total with shipping
    const subtotal = cartItems.reduce((sum: number, item: any) => {
      const price = typeof item.product.price === "string" 
        ? parseFloat(item.product.price) 
        : Number(item.product.price);
      const qty = item.quantity || 1;
      return sum + price * qty;
    }, 0);

    const shipping = shippingAmount || 0;
    const totalAmount = subtotal + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create order with items
      const order = await tx.order.create({
        data: {
          userId: user.id,
          orderNumber,
          totalAmount,
          shippingAmount: shipping,
          shippingAddressId: shippingAddressId || null,
          shippingAddressText,
          paymentMethod: paymentMethod || "online",
          paymentStatus: "pending",
          status: OrderStatus.pending,
          notes,
          items: {
            create: cartItems.map((item: any) => {
              const price = typeof item.product.price === "string"
                ? parseFloat(item.product.price)
                : Number(item.product.price);
              const qty = item.quantity || 1;
              
              // Get product image - prefer first image from images array, fallback to imageUrl
              const productImageUrl = item.product.images?.[0]?.imageUrl || item.product.imageUrl || null;

              return {
                productId: item.productId,
                productName: item.product.name,
                productImageUrl,
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
          shippingAddress: true,
        },
      });

      // Update product stock quantities
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { userId: user.id },
      });

      return order;
    });

    return ApiResponseHandler.created({ order: result }, "Order created successfully");
  } catch (error: any) {
    console.error("Order POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('not found') || error.message?.includes('Insufficient stock') || error.message?.includes('not available')) {
      return ApiResponseHandler.badRequest(error.message);
    }
    
    return ApiResponseHandler.error("Failed to create order", 500, error);
  }
}

