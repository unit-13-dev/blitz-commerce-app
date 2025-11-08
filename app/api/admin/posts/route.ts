import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  try {
    // Require admin role
    await requireRole('admin' as UserRole, request);

    const posts = await prisma.post.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        images: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ApiResponseHandler.success({ posts }, "Posts fetched successfully");
  } catch (error: any) {
    console.error("Admin posts GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden('Admin access required');
    }
    
    return ApiResponseHandler.error("Failed to fetch posts", 500, error);
  }
}
