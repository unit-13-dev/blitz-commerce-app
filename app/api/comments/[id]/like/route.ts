import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const { like } = body;

    const existing = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId: id,
          userId: user.id,
        },
      },
    });

    if (like) {
      if (!existing) {
        await prisma.commentLike.create({
          data: {
            commentId: id,
            userId: user.id,
          },
        });
      }
      return ApiResponseHandler.success({ liked: true }, "Comment liked successfully");
    } else {
      if (existing) {
        await prisma.commentLike.delete({
          where: { id: existing.id },
        });
      }
      return ApiResponseHandler.success({ liked: false }, "Comment unliked successfully");
    }
  } catch (error: any) {
    console.error("Comment like error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to toggle like", 500, error);
  }
}
