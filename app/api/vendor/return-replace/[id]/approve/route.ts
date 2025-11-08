import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole, ReturnReplaceRequestStatus, OrderStatus, PaymentStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const user = await requireRole([UserRole.vendor, UserRole.admin]);

    // Get the request
    const returnReplaceRequest = await prisma.returnReplaceRequest.findUnique({
      where: { id: requestId },
      include: {
        order: true,
        orderItem: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!returnReplaceRequest) {
      return ApiResponseHandler.notFound("Request not found");
    }

    // Verify vendor ownership
    if (returnReplaceRequest.vendorId !== user.id && user.role !== UserRole.admin) {
      return ApiResponseHandler.forbidden("You can only approve requests for your own products");
    }

    // Check if request is already processed
    if (returnReplaceRequest.status !== ReturnReplaceRequestStatus.pending) {
      return ApiResponseHandler.badRequest("Request has already been processed");
    }

    // Process approval
    const result = await prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.returnReplaceRequest.update({
        where: { id: requestId },
        data: {
          status: ReturnReplaceRequestStatus.approved,
          approvedAt: new Date(),
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
        },
      });

      // Update order status based on request type
      if (updatedRequest.type === "return") {
        // For return: Process refund (hardcoded for now)
        await tx.returnReplaceRequest.update({
          where: { id: requestId },
          data: {
            returnPaymentStatus: PaymentStatus.paid, // Hardcoded: payment processed
            status: ReturnReplaceRequestStatus.processed,
            processedAt: new Date(),
          },
        });

        // Update order status
        await tx.order.update({
          where: { id: updatedRequest.orderId },
          data: {
            status: OrderStatus.return_processed,
          },
        });

        // Restore product stock
        await tx.product.update({
          where: { id: updatedRequest.orderItem.productId },
          data: {
            stockQuantity: {
              increment: updatedRequest.orderItem.quantity,
            },
          },
        });
      } else if (updatedRequest.type === "replace") {
        // For replace: Process replacement (hardcoded for now)
        await tx.returnReplaceRequest.update({
          where: { id: requestId },
          data: {
            status: ReturnReplaceRequestStatus.processed,
            processedAt: new Date(),
          },
        });

        // Update order status
        await tx.order.update({
          where: { id: updatedRequest.orderId },
          data: {
            status: OrderStatus.replace_processed,
          },
        });

        // Note: In a real system, you would create a new shipment here
        // For now, we just mark it as processed
      }

      return updatedRequest;
    });

    return ApiResponseHandler.success(
      { request: result },
      `Request approved successfully. ${returnReplaceRequest.type === "return" ? "Refund processed." : "Replacement processed."}`
    );
  } catch (error: any) {
    console.error("Approve return/replace request error", error);

    if (error.message?.includes('UNAUTHORIZED') || error.message?.includes('FORBIDDEN')) {
      return error.message?.includes('FORBIDDEN')
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to approve request", 500, error);
  }
}

