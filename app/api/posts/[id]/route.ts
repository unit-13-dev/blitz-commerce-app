import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
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
            product: true,
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!post) {
      return ApiResponseHandler.notFound("Post not found");
    }

    return ApiResponseHandler.success({ post }, "Post fetched successfully");
  } catch (error: any) {
    console.error("Post GET error", error);
    return ApiResponseHandler.error("Failed to fetch post", 500, error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);
    
    if (!user) {
      return ApiResponseHandler.unauthorized();
    }

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return ApiResponseHandler.notFound("Post not found");
    }

    // Only post owner or admin can delete
    if (post.userId !== user.id && user.role !== "admin") {
      return ApiResponseHandler.forbidden("You can only delete your own posts");
    }

    await prisma.post.delete({
      where: { id },
    });

    return ApiResponseHandler.success({ message: "Post deleted" }, "Post deleted successfully");
  } catch (error: any) {
    console.error("Post DELETE error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to delete post", 500, error);
  }
}

