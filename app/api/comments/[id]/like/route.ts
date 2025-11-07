import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { like } = body;

    const existing = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId: id,
          userId,
        },
      },
    });

    if (like) {
      if (!existing) {
        await prisma.commentLike.create({
          data: {
            commentId: id,
            userId,
          },
        });
      }
      return NextResponse.json({ liked: true });
    } else {
      if (existing) {
        await prisma.commentLike.delete({
          where: { id: existing.id },
        });
      }
      return NextResponse.json({ liked: false });
    }
  } catch (error) {
    console.error("Comment like error", error);
    return NextResponse.json({ message: "Failed to toggle like" }, { status: 500 });
  }
}
