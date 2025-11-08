import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(request);

    const deleted = await prisma.wishlistItem.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { id },
          { productId: id },
        ],
      },
    });

    if (deleted.count === 0) {
      return ApiResponseHandler.notFound("Item not found in wishlist");
    }

    return ApiResponseHandler.success({ message: "Removed from wishlist" }, "Item removed from wishlist successfully");
  } catch (error: any) {
    console.error("Wishlist DELETE error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to remove from wishlist", 500, error);
  }
}

