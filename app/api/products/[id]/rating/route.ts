import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const posts = await prisma.post.findMany({
      where: {
        status: "published",
        rating: {
          not: null,
        },
        taggedItems: {
          some: {
            productId: id,
          },
        },
        tags: {
          some: {
            tag: {
              name: 'review',
            },
          },
        },
      },
      select: {
        rating: true,
      },
    });

    const ratings = posts.map((post) => post.rating).filter((rating): rating is number => rating !== null);
    const reviewCount = ratings.length;
    const averageRating = reviewCount > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount : 0;

    return ApiResponseHandler.success({ averageRating, reviewCount }, "Rating fetched successfully");
  } catch (error: any) {
    console.error("Product rating GET error", error);
    return ApiResponseHandler.error("Failed to fetch rating", 500, error);
  }
}

