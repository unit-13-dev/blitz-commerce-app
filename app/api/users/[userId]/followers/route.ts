import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
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

    return NextResponse.json({
      followers: followers.map((f) => ({
        id: f.follower.id,
        fullName: f.follower.fullName,
        email: f.follower.email,
        avatarUrl: f.follower.avatarUrl,
      })),
    });
  } catch (error) {
    console.error("Followers GET error", error);
    return NextResponse.json({ message: "Failed to fetch followers" }, { status: 500 });
  }
}
