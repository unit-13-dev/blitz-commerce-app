import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getAuthSession();
  const followerId = session?.user?.id;

  if (!followerId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (followerId === userId) {
    return NextResponse.json({ message: "Cannot follow yourself" }, { status: 400 });
  }

  try {
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ message: "Already following" }, { status: 400 });
    }

    await prisma.follow.create({
      data: {
        followerId,
        followingId: userId,
      },
    });

    return NextResponse.json({ message: "Followed successfully" });
  } catch (error) {
    console.error("Follow error", error);
    return NextResponse.json({ message: "Failed to follow user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getAuthSession();
  const followerId = session?.user?.id;

  if (!followerId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId: userId,
      },
    });

    return NextResponse.json({ message: "Unfollowed successfully" });
  } catch (error) {
    console.error("Unfollow error", error);
    return NextResponse.json({ message: "Failed to unfollow user" }, { status: 500 });
  }
}
