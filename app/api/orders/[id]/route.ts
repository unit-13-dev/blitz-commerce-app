import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const order = await prisma.order.findUnique({
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
            returnReplaceRequests: {
              orderBy: { requestedAt: "desc" },
              include: {
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
        returnReplaceRequests: {
          orderBy: { requestedAt: "desc" },
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
        },
      },
    });

    if (!order) {
      return ApiResponseHandler.notFound("Order not found");
    }

    const isAdmin = user.role === "admin";
    if (!isAdmin && order.userId !== user.id) {
      return ApiResponseHandler.forbidden("You can only view your own orders");
    }

    return ApiResponseHandler.success({ order }, "Order fetched successfully");
  } catch (error: any) {
    console.error("Order GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to fetch order", 500, error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    // Only admin and vendor can update orders
    if (user.role !== "admin" && user.role !== "vendor") {
      return ApiResponseHandler.forbidden("Only admins and vendors can update orders");
    }

    const body = await request.json();
    const { status, paymentStatus } = body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: status ? status : undefined,
        paymentStatus: paymentStatus ? paymentStatus : undefined,
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

    return ApiResponseHandler.success({ order }, "Order updated successfully");
  } catch (error: any) {
    console.error("Order PUT error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to update order", 500, error);
  }
}

