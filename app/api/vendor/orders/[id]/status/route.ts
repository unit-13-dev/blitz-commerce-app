import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole, OrderStatus } from "@prisma/client";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["dispatched"],
  dispatched: ["shipped"],
  shipped: ["delivered"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole([UserRole.vendor, UserRole.admin]);

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return ApiResponseHandler.badRequest("Status is required");
    }

    const statusLower = status.toLowerCase();
    let newStatusEnum: OrderStatus;
    
    // Map string status to enum
    switch (statusLower) {
      case "confirmed":
        newStatusEnum = OrderStatus.confirmed;
        break;
      case "dispatched":
        newStatusEnum = OrderStatus.dispatched;
        break;
      case "shipped":
        newStatusEnum = OrderStatus.shipped;
        break;
      case "delivered":
        newStatusEnum = OrderStatus.delivered;
        break;
      default:
        return ApiResponseHandler.badRequest(
          `Invalid status. Allowed values: confirmed, dispatched, shipped, delivered`
        );
    }

    const order = await prisma.order.findUnique({
      where: { id },
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

    // Check if order belongs to vendor
    const vendorProducts = order.items.filter(
      (item) => item.product.vendorId === user.id
    );

    if (vendorProducts.length === 0 && user.role !== UserRole.admin) {
      return ApiResponseHandler.forbidden("Order does not belong to this vendor");
    }

    const currentStatus = order.status;
    const currentStatusLower = currentStatus.toLowerCase();

    // Validate status transition
    if (currentStatus === newStatusEnum) {
      return ApiResponseHandler.badRequest(`Order is already ${statusLower}`);
    }

    // Check if transition is valid
    const allowedTransitions = STATUS_TRANSITIONS[currentStatusLower] || [];
    if (!allowedTransitions.includes(statusLower) && currentStatus !== OrderStatus.pending) {
      return ApiResponseHandler.badRequest(
        `Cannot transition from ${currentStatusLower} to ${statusLower}. Allowed transitions: ${allowedTransitions.join(", ")}`
      );
    }

    // Special case: can only update to confirmed if pending
    if (currentStatus === OrderStatus.pending && newStatusEnum !== OrderStatus.confirmed) {
      return ApiResponseHandler.badRequest(
        "Pending orders must be confirmed first. Use /confirm endpoint."
      );
    }

    // Prepare update data
    const updateData: any = {
      status: newStatusEnum,
    };

    // Set appropriate timestamp based on status
    const now = new Date();
    switch (newStatusEnum) {
      case OrderStatus.dispatched:
        updateData.dispatchedAt = now;
        break;
      case OrderStatus.shipped:
        updateData.shippedAt = now;
        break;
      case OrderStatus.delivered:
        updateData.deliveredAt = now;
        break;
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
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
        shippingAddress: true,
      },
    });

    return ApiResponseHandler.success(
      { order: updatedOrder },
      `Order status updated to ${statusLower} successfully`
    );
  } catch (error: any) {
    console.error("Vendor order status update error", error);

    if (error.message?.includes("UNAUTHORIZED") || error.message?.includes("FORBIDDEN")) {
      return error.message?.includes("FORBIDDEN")
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to update order status", 500, error);
  }
}

