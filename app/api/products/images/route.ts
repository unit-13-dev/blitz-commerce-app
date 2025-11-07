import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return ApiResponseHandler.success({ images: {} }, "Images fetched successfully");
    }

    const productIds = idsParam.split(",").filter(Boolean);

    const images = await prisma.productImage.findMany({
      where: {
        productId: { in: productIds },
      },
      orderBy: [
        { productId: "asc" },
        { displayOrder: "asc" },
      ],
    });

    // Group by product_id and take first image
    const imageMap: Record<string, string | null> = {};
    const seenProducts = new Set<string>();

    for (const img of images) {
      if (!seenProducts.has(img.productId)) {
        imageMap[img.productId] = img.imageUrl;
        seenProducts.add(img.productId);
      }
    }

    // Fill in missing products with null
    for (const id of productIds) {
      if (!imageMap[id]) {
        imageMap[id] = null;
      }
    }

    return ApiResponseHandler.success({ images: imageMap }, "Images fetched successfully");
  } catch (error: any) {
    console.error("Product images GET error", error);
    return ApiResponseHandler.error("Failed to fetch images", 500, error);
  }
}

