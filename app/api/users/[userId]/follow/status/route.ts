import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return ApiResponseHandler.success({ isFollowing: false }, "Follow status fetched");
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userId,
        },
      },
    });

    return ApiResponseHandler.success({ isFollowing: !!follow }, "Follow status fetched");
  } catch (error: any) {
    console.error("Follow status error", error);
    return ApiResponseHandler.success({ isFollowing: false }, "Follow status fetched");
  }
}
