import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole, OrderStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole([UserRole.vendor, UserRole.admin]);

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

    // Validate order can be confirmed
    if (order.status.toLowerCase() !== "pending") {
      return ApiResponseHandler.badRequest(
        `Cannot confirm order with status: ${order.status}. Only pending orders can be confirmed.`
      );
    }

    // Calculate expected delivery date (5 days from now)
    const confirmedAt = new Date();
    const expectedDeliveryDate = new Date(confirmedAt);
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 5);

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.confirmed,
        confirmedAt,
        expectedDeliveryDate,
      },
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
      "Order confirmed successfully"
    );
  } catch (error: any) {
    console.error("Vendor order confirm error", error);

    if (error.message?.includes("UNAUTHORIZED") || error.message?.includes("FORBIDDEN")) {
      return error.message?.includes("FORBIDDEN")
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to confirm order", 500, error);
  }
}

