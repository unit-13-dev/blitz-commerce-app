import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
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

    return NextResponse.json({
      following: following.map((f) => ({
        id: f.following.id,
        fullName: f.following.fullName,
        email: f.following.email,
        avatarUrl: f.following.avatarUrl,
      })),
    });
  } catch (error) {
    console.error("Following GET error", error);
    return NextResponse.json({ message: "Failed to fetch following" }, { status: 500 });
  }
}
