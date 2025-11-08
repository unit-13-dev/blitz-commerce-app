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

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

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

    // Validate order can be rejected
    const currentStatus = order.status.toLowerCase();
    if (currentStatus === "delivered" || currentStatus === "cancelled" || currentStatus === "rejected") {
      return ApiResponseHandler.badRequest(
        `Cannot reject order with status: ${order.status}`
      );
    }

    // Restore stock for vendor's products
    await prisma.$transaction(async (tx) => {
      for (const item of vendorProducts) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Update order status
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.rejected,
          rejectedAt: new Date(),
          rejectionReason: reason || null,
        },
      });
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
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
      "Order rejected successfully"
    );
  } catch (error: any) {
    console.error("Vendor order reject error", error);

    if (error.message?.includes("UNAUTHORIZED") || error.message?.includes("FORBIDDEN")) {
      return error.message?.includes("FORBIDDEN")
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to reject order", 500, error);
  }
}

