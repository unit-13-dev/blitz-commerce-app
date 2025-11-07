import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const discountTiers = await prisma.productDiscountTier.findMany({
      where: { productId: id },
      orderBy: { tierNumber: "asc" },
    });

    return ApiResponseHandler.success({ discountTiers }, "Discount tiers fetched successfully");
  } catch (error: any) {
    console.error("Discount tiers GET error", error);
    return ApiResponseHandler.error("Failed to fetch discount tiers", 500, error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return ApiResponseHandler.notFound("Product not found");
    }

    if (product.vendorId !== user.id && user.role !== "admin") {
      return ApiResponseHandler.forbidden("You can only update discount tiers for your own products");
    }

    const body = await request.json();
    const { discountTiers } = body;

    // Delete existing tiers
    await prisma.productDiscountTier.deleteMany({
      where: { productId: id },
    });

    // Create new tiers
    if (discountTiers && discountTiers.length > 0) {
      await prisma.productDiscountTier.createMany({
        data: discountTiers.map((tier: any, index: number) => ({
          productId: id,
          tierNumber: index + 1,
          membersRequired: tier.membersRequired,
          discountPercentage: tier.discountPercentage,
        })),
      });

      // Enable group order on product
      await prisma.product.update({
        where: { id },
        data: { groupOrderEnabled: true },
      });
    } else {
      // Disable group order if no tiers
      await prisma.product.update({
        where: { id },
        data: { groupOrderEnabled: false },
      });
    }

    const updatedTiers = await prisma.productDiscountTier.findMany({
      where: { productId: id },
      orderBy: { tierNumber: "asc" },
    });

    return ApiResponseHandler.success({ discountTiers: updatedTiers }, "Discount tiers updated successfully");
  } catch (error: any) {
    console.error("Discount tiers PUT error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to update discount tiers", 500, error);
  }
}
