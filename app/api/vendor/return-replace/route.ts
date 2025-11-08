import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole, ReturnReplaceRequestStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireRole([UserRole.vendor, UserRole.admin]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const type = searchParams.get("type"); // 'return' or 'replace'

    const where: any = {
      vendorId: user.id,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const requests = await prisma.returnReplaceRequest.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
        orderItem: {
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
      },
      orderBy: { requestedAt: "desc" },
    });

    return ApiResponseHandler.success({ requests }, "Return/replace requests fetched successfully");
  } catch (error: any) {
    console.error("Vendor return/replace requests GET error", error);

    if (error.message?.includes('UNAUTHORIZED') || error.message?.includes('FORBIDDEN')) {
      return error.message?.includes('FORBIDDEN')
        ? ApiResponseHandler.forbidden()
        : ApiResponseHandler.unauthorized();
    }

    return ApiResponseHandler.error("Failed to fetch return/replace requests", 500, error);
  }
}

