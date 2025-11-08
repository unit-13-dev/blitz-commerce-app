import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { ReturnReplaceRequestType, ReturnReplaceRequestStatus, OrderStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const user = await requireAuth();

    const body = await request.json();
    const { orderItemId, reason } = body;

    if (!orderItemId) {
      return ApiResponseHandler.badRequest("Order item ID is required");
    }

    // Get order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return ApiResponseHandler.notFound("Order not found");
    }

    if (order.userId !== user.id) {
      return ApiResponseHandler.forbidden("You can only request replacements for your own orders");
    }

    // Find the order item
    const orderItem = order.items.find((item) => item.id === orderItemId);
    if (!orderItem) {
      return ApiResponseHandler.notFound("Order item not found");
    }

    // Check if product is replaceable
    if (!orderItem.product.isReplaceable) {
      return ApiResponseHandler.badRequest("This product is not replaceable");
    }

    // Check if order is in a valid state for replacement
    if (order.status === OrderStatus.cancelled || order.status === OrderStatus.replace_processed) {
      return ApiResponseHandler.badRequest("Cannot replace items from this order");
    }

    // Check if there's already a pending replace request for this item
    const existingRequest = await prisma.returnReplaceRequest.findFirst({
      where: {
        orderItemId,
        type: ReturnReplaceRequestType.replace,
        status: {
          in: [ReturnReplaceRequestStatus.pending, ReturnReplaceRequestStatus.approved],
        },
      },
    });

    if (existingRequest) {
      return ApiResponseHandler.badRequest("A replace request is already pending or approved for this item");
    }

    // Get vendor ID from product
    const vendorId = orderItem.product.vendorId;

    // Create replace request
    const replaceRequest = await prisma.$transaction(async (tx) => {
      // Create the replace request
      const request = await tx.returnReplaceRequest.create({
        data: {
          orderId,
          orderItemId,
          userId: user.id,
          vendorId,
          type: ReturnReplaceRequestType.replace,
          status: ReturnReplaceRequestStatus.pending,
          reason: reason || null,
        },
        include: {
          orderItem: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          vendor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Update order status if not already in a replace state
      if (order.status !== OrderStatus.replace_requested && order.status !== OrderStatus.replace_approved) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.replace_requested },
        });
      }

      return request;
    });

    return ApiResponseHandler.success(
      { replaceRequest },
      "Replace request created successfully. Waiting for vendor approval."
    );
  } catch (error: any) {
    console.error("Replace request error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to create replace request", 500, error);
  }
}

