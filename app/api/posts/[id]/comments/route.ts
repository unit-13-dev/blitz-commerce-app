import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const userId = user?.id ?? null;

    const comments = await prisma.postComment.findMany({
      where: { postId: id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        likes: userId
          ? {
              where: { userId },
            }
          : false,
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const commentsWithLikes = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.fullName || comment.user.email?.split("@")[0] || "Unknown User",
        avatar: comment.user.avatarUrl,
      },
      liked: userId ? (comment.likes && comment.likes.length > 0) : false,
      likes_count: comment._count.likes,
    }));

    return ApiResponseHandler.success({ comments: commentsWithLikes }, "Comments fetched successfully");
  } catch (error: any) {
    console.error("Comments GET error", error);
    return ApiResponseHandler.error("Failed to fetch comments", 500, error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return ApiResponseHandler.badRequest("Comment content is required");
    }

    const comment = await prisma.postComment.create({
      data: {
        postId: id,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    const commentResponse = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.fullName || comment.user.email?.split("@")[0] || "Unknown User",
        avatar: comment.user.avatarUrl,
      },
      liked: false,
      likes_count: comment._count.likes,
    };

    return ApiResponseHandler.created({ comment: commentResponse }, "Comment created successfully");
  } catch (error: any) {
    console.error("Comment POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to create comment", 500, error);
  }
}
