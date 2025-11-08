import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole } from "@prisma/client";
import { getAvailableCategories } from "@/lib/product-utils";

export async function GET() {
  try {
    // Get both dynamic categories (from ProductCategory table) and enum categories
    const [dynamicCategories, enumCategories] = await Promise.all([
      prisma.productCategory.findMany({
        orderBy: { name: "asc" },
      }),
      Promise.resolve(getAvailableCategories()),
    ]);

    // Transform enum categories to match the expected structure
    const transformedEnumCategories = enumCategories.map(cat => ({
      id: cat, // Use enum value as ID
      name: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format as readable name
      value: cat, // Keep original enum value
      type: 'enum' as const,
    }));

    // Transform dynamic categories to include type
    const transformedDynamicCategories = dynamicCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: 'dynamic' as const,
    }));

    // Combine both types into a single array
    const allCategories = [
      ...transformedEnumCategories,
      ...transformedDynamicCategories,
    ];

    return ApiResponseHandler.success(
      { 
        categories: allCategories,
        dynamicCategories: transformedDynamicCategories,
        enumCategories: transformedEnumCategories,
      }, 
      "Categories fetched successfully"
    );
  } catch (error: any) {
    console.error("Categories GET error", error);
    return ApiResponseHandler.error("Failed to fetch categories", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(UserRole.admin);
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

