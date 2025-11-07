import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "newest";
    const filterBy = searchParams.get("filterBy") || "all";
    const skip = page * limit;

    // Get the review tag
    const reviewTag = await prisma.postTag.findUnique({
      where: { name: "review" },
    });

    if (!reviewTag) {
      return ApiResponseHandler.paginated([], 0, page, limit, "No reviews found");
    }

    // Build where clause
    const where: any = {
      status: "published",
      rating: { not: null },
      tags: {
        some: {
          tagId: reviewTag.id,
        },
      },
      taggedItems: {
        some: {
          productId: id,
        },
      },
    };

    // Apply rating filter
    if (filterBy !== "all") {
      where.rating = parseInt(filterBy);
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sortBy) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "highest":
        orderBy = { rating: "desc" };
        break;
      case "lowest":
        orderBy = { rating: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [reviews, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              email: true,
            },
          },
          images: {
            orderBy: { displayOrder: "asc" },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          taggedItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    const processedReviews = reviews.map((post) => ({
      id: post.id,
      content: post.content,
      rating: post.rating,
      created_at: post.createdAt,
      profiles: {
        full_name: post.user.fullName || post.user.email?.split("@")[0] || "Unknown",
        avatar_url: post.user.avatarUrl,
      },
      post_images: post.images.map((img) => ({
        image_url: img.imageUrl,
        display_order: img.displayOrder,
      })),
      post_tag_mappings: post.tags.map((t) => ({
        post_tags: {
          name: t.tag.name,
        },
      })),
      tagged_products: post.taggedItems.map((ti) => ({
        products: {
          id: ti.product.id,
          name: ti.product.name,
        },
      })),
      likes_count: post._count.likes,
      comments_count: post._count.comments,
    }));

    return ApiResponseHandler.paginated(processedReviews, total, page, limit, "Reviews fetched successfully");
  } catch (error: any) {
    console.error("Reviews GET error", error);
    return ApiResponseHandler.error("Failed to fetch reviews", 500, error);
  }
}
