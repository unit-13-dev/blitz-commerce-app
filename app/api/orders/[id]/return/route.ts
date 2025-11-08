import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { ReturnReplaceRequestType, ReturnReplaceRequestStatus, PaymentStatus, OrderStatus } from "@prisma/client";

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
      return ApiResponseHandler.forbidden("You can only request returns for your own orders");
    }

    // Find the order item
    const orderItem = order.items.find((item) => item.id === orderItemId);
    if (!orderItem) {
      return ApiResponseHandler.notFound("Order item not found");
    }

    // Check if product is returnable
    if (!orderItem.product.isReturnable) {
      return ApiResponseHandler.badRequest("This product is not returnable");
    }

    // Check if order is in a valid state for return
    if (order.status === OrderStatus.cancelled || order.status === OrderStatus.return_processed) {
      return ApiResponseHandler.badRequest("Cannot return items from this order");
    }

    // Check if there's already a pending return request for this item
    const existingRequest = await prisma.returnReplaceRequest.findFirst({
      where: {
        orderItemId,
        type: ReturnReplaceRequestType.return,
        status: {
          in: [ReturnReplaceRequestStatus.pending, ReturnReplaceRequestStatus.approved],
        },
      },
    });

    if (existingRequest) {
      return ApiResponseHandler.badRequest("A return request is already pending or approved for this item");
    }

    // Get vendor ID from product
    const vendorId = orderItem.product.vendorId;

    // Create return request
    const returnRequest = await prisma.$transaction(async (tx) => {
      // Create the return request
      const request = await tx.returnReplaceRequest.create({
        data: {
          orderId,
          orderItemId,
          userId: user.id,
          vendorId,
          type: ReturnReplaceRequestType.return,
          status: ReturnReplaceRequestStatus.pending,
          reason: reason || null,
          returnAmount: orderItem.totalPrice,
          returnPaymentStatus: PaymentStatus.pending,
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

      // Update order status if not already in a return state
      if (order.status !== OrderStatus.return_requested && order.status !== OrderStatus.return_approved) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.return_requested },
        });
      }

      return request;
    });

    return ApiResponseHandler.success(
      { returnRequest },
      "Return request created successfully. Waiting for vendor approval."
    );
  } catch (error: any) {
    console.error("Return request error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to create return request", 500, error);
  }
}

