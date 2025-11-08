import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return ApiResponseHandler.badRequest("User ID is required");
    }

    // Fetch recent 5 orders for the user
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
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
          take: 3, // Limit items per order for preview
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5, // Limit to 5 most recent orders
    });

    return ApiResponseHandler.success({ orders }, "Recent orders fetched successfully");
  } catch (error: any) {
    console.error("Recent orders GET error", error);
    return ApiResponseHandler.error("Failed to fetch recent orders", 500, error);
  }
}

