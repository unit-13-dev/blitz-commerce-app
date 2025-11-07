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

    const existing = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: user.id,
        },
      },
    });

    if (like) {
      // User wants to like
      if (!existing) {
        await prisma.postLike.create({
          data: {
            postId: id,
            userId: user.id,
          },
        });
      }
      return ApiResponseHandler.success({ liked: true }, "Post liked successfully");
    } else {
      // User wants to unlike
      if (existing) {
        await prisma.postLike.delete({
          where: { id: existing.id },
        });
      }
      return ApiResponseHandler.success({ liked: false }, "Post unliked successfully");
    }
  } catch (error: any) {
    console.error("Post like error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to toggle like", 500, error);
  }
}

