import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function GET(
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
            product: {
              include: {
                images: {
                  orderBy: { displayOrder: "asc" },
                },
                vendor: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
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

    // Filter items to only show vendor's products
    const filteredOrder = {
      ...order,
      items: vendorProducts,
    };

    return ApiResponseHandler.success(
      { order: filteredOrder },
      "Order fetched successfully"
    );
  } catch (error: any) {
    console.error("Vendor order GET error", error);

    if (error.message?.includes("UNAUTHORIZED") || error.message?.includes("FORBIDDEN")) {
      return error.message?.includes("FORBIDDEN")
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to fetch order", 500, error);
  }
}

