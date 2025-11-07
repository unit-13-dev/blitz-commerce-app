import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
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

    const followingList = following.map((f) => ({
      id: f.following.id,
      fullName: f.following.fullName,
      email: f.following.email,
      avatarUrl: f.following.avatarUrl,
    }));

    return ApiResponseHandler.success({ following: followingList }, "Following fetched successfully");
  } catch (error: any) {
    console.error("Following GET error", error);
    return ApiResponseHandler.error("Failed to fetch following", 500, error);
  }
}
