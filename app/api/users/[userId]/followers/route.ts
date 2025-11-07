import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const followersList = followers.map((f) => ({
      id: f.follower.id,
      fullName: f.follower.fullName,
      email: f.follower.email,
      avatarUrl: f.follower.avatarUrl,
    }));

    return ApiResponseHandler.success({ followers: followersList }, "Followers fetched successfully");
  } catch (error: any) {
    console.error("Followers GET error", error);
    return ApiResponseHandler.error("Failed to fetch followers", 500, error);
  }
}
