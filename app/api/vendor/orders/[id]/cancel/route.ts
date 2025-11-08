import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole, OrderStatus, PaymentStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const user = await requireRole([UserRole.vendor, UserRole.admin]);

    const body = await request.json();
    const { cancellationReason } = body;

    // Get order
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

    // Verify vendor owns products in this order (or is admin)
    const vendorItems = order.items.filter(
      (item) => item.product.vendorId === user.id
    );

    if (vendorItems.length === 0 && user.role !== UserRole.admin) {
      return ApiResponseHandler.forbidden("You don't have products in this order");
    }

    // Check if order can be cancelled
    if (order.status === OrderStatus.cancelled) {
      return ApiResponseHandler.badRequest("Order is already cancelled");
    }

    if (order.status === OrderStatus.rejected) {
      return ApiResponseHandler.badRequest("Cannot cancel a rejected order");
    }

    // Vendor can only cancel orders before shipping
    if (order.status === OrderStatus.shipped || order.status === OrderStatus.delivered) {
      return ApiResponseHandler.badRequest(
        "Cannot cancel order. Order is already shipped or delivered. Customer must use return/replace request."
      );
    }

    // Validate that vendor's products are refundable
    const nonRefundableProducts = vendorItems.filter((item) => !item.product.isReturnable);
    if (nonRefundableProducts.length > 0) {
      return ApiResponseHandler.badRequest(
        `Cannot cancel order. Some of your products are not refundable: ${nonRefundableProducts.map((item) => item.product.name).join(", ")}`
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
          cancellationReason: cancellationReason || null,
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

      // Restore product stock for vendor's items only
      for (const item of vendorItems) {
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
      "Order cancelled successfully. Refund has been processed for the customer."
    );
  } catch (error: any) {
    console.error("Vendor cancel order error", error);
    
    if (error.message?.includes('UNAUTHORIZED') || error.message?.includes('FORBIDDEN')) {
      return error.message?.includes('FORBIDDEN')
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to cancel order", 500, error);
  }
}

