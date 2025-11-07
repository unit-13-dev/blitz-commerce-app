import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function DELETE() {
  try {
    const user = await requireAuth();

    await prisma.cartItem.deleteMany({
      where: { userId: user.id },
    });

    return ApiResponseHandler.success({ message: "Cart cleared" }, "Cart cleared successfully");
  } catch (error: any) {
    console.error("Cart clear error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to clear cart", 500, error);
  }
}

