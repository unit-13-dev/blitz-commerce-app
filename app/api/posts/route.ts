import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = searchParams.get("userId");
    const skip = page * limit;

    const where: any = {
      status: "published",
      privacy: "public",
    };

    if (userId) {
      where.userId = userId;
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
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
                include: {
                  images: {
                    orderBy: { displayOrder: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
          likes: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return ApiResponseHandler.paginated(posts, total, page, limit, "Posts fetched successfully");
  } catch (error: any) {
    console.error("Posts GET error", error);
    return ApiResponseHandler.error("Failed to fetch posts", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      content,
      privacy = "public",
      status = "published",
      rating,
      images,
      tags,
      taggedProducts,
    } = body;

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content,
        privacy,
        status,
        rating: rating ? parseFloat(rating) : null,
        images: images
          ? {
              create: images.map((img: string, index: number) => ({
                imageUrl: img,
                displayOrder: index,
              })),
            }
          : undefined,
        tags: tags
          ? {
              create: tags.map((tagName: string) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
        taggedItems: taggedProducts
          ? {
              create: taggedProducts.map((productId: string) => ({
                productId,
              })),
            }
          : undefined,
      },
      include: {
        user: true,
        images: true,
        tags: { include: { tag: true } },
      },
    });

    return ApiResponseHandler.created({ post }, "Post created successfully");
  } catch (error: any) {
    console.error("Post POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to create post", 500, error);
  }
}

