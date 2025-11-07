import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await requireAuth();

    if (user.id === userId) {
      return ApiResponseHandler.badRequest("Cannot follow yourself");
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userId,
        },
      },
    });

    if (existing) {
      return ApiResponseHandler.badRequest("Already following this user");
    }

    await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: userId,
      },
    });

    return ApiResponseHandler.success({ message: "Followed successfully" }, "Followed successfully");
  } catch (error: any) {
    console.error("Follow error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to follow user", 500, error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await requireAuth();

    await prisma.follow.deleteMany({
      where: {
        followerId: user.id,
        followingId: userId,
      },
    });

    return ApiResponseHandler.success({ message: "Unfollowed successfully" }, "Unfollowed successfully");
  } catch (error: any) {
    console.error("Unfollow error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to unfollow user", 500, error);
  }
}
