import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { name: "asc" },
    });

    return ApiResponseHandler.success({ categories }, "Categories fetched successfully");
  } catch (error: any) {
    console.error("Categories GET error", error);
    return ApiResponseHandler.error("Failed to fetch categories", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin" as UserRole, request);
    const body = await request.json();
    
    if (!body.name || body.name.trim().length === 0) {
      return ApiResponseHandler.badRequest("Category name is required");
    }

    const category = await prisma.productCategory.create({
      data: { name: body.name.trim() },
    });

    return ApiResponseHandler.created({ category }, "Category created successfully");
  } catch (error: any) {
    console.error("Category POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to create category", 500, error);
  }
}

