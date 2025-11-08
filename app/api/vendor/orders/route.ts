import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireRole([UserRole.vendor, UserRole.admin]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {
      items: {
        some: {
          product: {
            vendorId: user.id,
          },
        },
      },
    };

    if (status && status !== "all") {
      where.status = status.toLowerCase();
    }

    // Get orders for vendor's products
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          where: {
            product: {
              vendorId: user.id,
            },
          },
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
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Get counts by status
    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      where: {
        items: {
          some: {
            product: {
              vendorId: user.id,
            },
          },
        },
      },
      _count: {
        id: true,
      },
    });

    const counts = statusCounts.reduce((acc: any, item: any) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});

    return ApiResponseHandler.success(
      {
        orders,
        counts: {
          all: orders.length,
          pending: counts.pending || 0,
          confirmed: counts.confirmed || 0,
          dispatched: counts.dispatched || 0,
          shipped: counts.shipped || 0,
          delivered: counts.delivered || 0,
          cancelled: counts.cancelled || 0,
          rejected: counts.rejected || 0,
        },
      },
      "Vendor orders fetched successfully"
    );
  } catch (error: any) {
    console.error("Vendor orders GET error", error);

    if (error.message?.includes("UNAUTHORIZED") || error.message?.includes("FORBIDDEN")) {
      return error.message?.includes("FORBIDDEN")
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to fetch vendor orders", 500, error);
  }
}

