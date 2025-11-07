import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    // Require admin role
    await requireRole('admin');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return ApiResponseHandler.success({ users }, "Users fetched successfully");
  } catch (error: any) {
    console.error("Admin users GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden('Admin access required');
    }
    
    return ApiResponseHandler.error("Failed to fetch users", 500, error);
  }
}
