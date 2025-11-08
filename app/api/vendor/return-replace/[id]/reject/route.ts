import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole, ReturnReplaceRequestStatus, OrderStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const user = await requireRole([UserRole.vendor, UserRole.admin]);

    const body = await request.json();
    const { rejectionReason } = body;

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
      return ApiResponseHandler.forbidden("You can only reject requests for your own products");
    }

    // Check if request is already processed
    if (returnReplaceRequest.status !== ReturnReplaceRequestStatus.pending) {
      return ApiResponseHandler.badRequest("Request has already been processed");
    }

    // Get the original order status before the request
    // We'll revert to the previous status (e.g., delivered, shipped, etc.)
    const originalStatus = returnReplaceRequest.order.status === OrderStatus.return_requested 
      ? OrderStatus.delivered 
      : returnReplaceRequest.order.status === OrderStatus.replace_requested
      ? OrderStatus.delivered
      : returnReplaceRequest.order.status;

    // Process rejection
    const result = await prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.returnReplaceRequest.update({
        where: { id: requestId },
        data: {
          status: ReturnReplaceRequestStatus.rejected,
          rejectedAt: new Date(),
          rejectedReason: rejectionReason || "Request rejected by vendor",
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

      // Revert order status to original state
      // Check if there are any other pending requests for this order
      const otherPendingRequests = await tx.returnReplaceRequest.findFirst({
        where: {
          orderId: returnReplaceRequest.orderId,
          id: { not: requestId },
          status: ReturnReplaceRequestStatus.pending,
        },
      });

      // Only revert if there are no other pending requests
      if (!otherPendingRequests) {
        await tx.order.update({
          where: { id: returnReplaceRequest.orderId },
          data: {
            status: originalStatus,
          },
        });
      }

      return updatedRequest;
    });

    return ApiResponseHandler.success(
      { request: result },
      "Request rejected successfully. Order status reverted to original state."
    );
  } catch (error: any) {
    console.error("Reject return/replace request error", error);

    if (error.message?.includes('UNAUTHORIZED') || error.message?.includes('FORBIDDEN')) {
      return error.message?.includes('FORBIDDEN')
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to reject request", 500, error);
  }
}

