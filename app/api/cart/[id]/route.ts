import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(request);
    const body = await request.json();
    const { quantity } = body;

    const item = await prisma.cartItem.findUnique({
      where: { id },
    });

    if (!item || item.userId !== user.id) {
      return ApiResponseHandler.notFound("Cart item not found");
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({
        where: { id },
      });
      return ApiResponseHandler.success({ message: "Item removed" }, "Item removed successfully");
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
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
    });

    return ApiResponseHandler.success({ item: updated }, "Cart item updated successfully");
  } catch (error: any) {
    console.error("Cart PUT error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to update cart", 500, error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(request);

    const item = await prisma.cartItem.findUnique({
      where: { id },
    });

    if (!item || item.userId !== user.id) {
      return ApiResponseHandler.notFound("Cart item not found");
    }

    await prisma.cartItem.delete({
      where: { id },
    });

    return ApiResponseHandler.success({ message: "Item removed" }, "Item removed successfully");
  } catch (error: any) {
    console.error("Cart DELETE error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to remove item", 500, error);
  }
}

