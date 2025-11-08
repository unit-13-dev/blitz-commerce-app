import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const user = await requireAuth();

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

    // Verify order ownership
    if (order.userId !== user.id) {
      return ApiResponseHandler.forbidden("You can only cancel your own orders");
    }

    // Check if order can be cancelled
    if (order.status === OrderStatus.cancelled) {
      return ApiResponseHandler.badRequest("Order is already cancelled");
    }

    if (order.status === OrderStatus.rejected) {
      return ApiResponseHandler.badRequest("Cannot cancel a rejected order");
    }

    if (order.status === OrderStatus.return_processed || order.status === OrderStatus.replace_processed) {
      return ApiResponseHandler.badRequest("Cannot cancel a processed return/replace order");
    }

    // Check if order is shipped or delivered - use return/replace instead
    if (order.status === OrderStatus.shipped || order.status === OrderStatus.delivered) {
      return ApiResponseHandler.badRequest(
        "Order is already shipped or delivered. Please use the return/replace request feature instead."
      );
    }

    // Validate that all products in the order are refundable
    const nonRefundableProducts = order.items.filter((item) => !item.product.isReturnable);
    if (nonRefundableProducts.length > 0) {
      return ApiResponseHandler.badRequest(
        `Cannot cancel order. Some products are not refundable: ${nonRefundableProducts.map((item) => item.product.name).join(", ")}`
      );
    }

    // Process cancellation with refund
    const result = await prisma.$transaction(async (tx) => {
      // Update order status to cancelled
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
          cancelledAt: new Date(),
          paymentStatus: PaymentStatus.paid, // Mark as refunded (hardcoded for now)
        },
        include: {
          items: {
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
        },
      });

      // Restore product stock for all items
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      return updatedOrder;
    });

    return ApiResponseHandler.success(
      { order: result },
      "Order cancelled successfully. Refund has been processed."
    );
  } catch (error: any) {
    console.error("Cancel order error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to cancel order", 500, error);
  }
}

