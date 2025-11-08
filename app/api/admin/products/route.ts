import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  try {
    // Require admin role
    await requireRole('admin' as UserRole, request);

    const products = await prisma.product.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        images: {
          orderBy: { displayOrder: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ApiResponseHandler.success({ products }, "Products fetched successfully");
  } catch (error: any) {
    console.error("Admin products GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden('Admin access required');
    }
    
    return ApiResponseHandler.error("Failed to fetch products", 500, error);
  }
}
