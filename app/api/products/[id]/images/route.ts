import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await prisma.productImage.findFirst({
      where: { productId: id },
      orderBy: { displayOrder: "asc" },
    });

    return ApiResponseHandler.success({ imageUrl: image?.imageUrl || null }, "Image fetched successfully");
  } catch (error: any) {
    console.error("Product image GET error", error);
    return ApiResponseHandler.error("Failed to fetch image", 500, error);
  }
}

