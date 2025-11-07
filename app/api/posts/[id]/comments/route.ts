import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id ?? null;

  try {
    const comments = await prisma.postComment.findMany({
      where: { postId: id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        likes: userId
          ? {
              where: { userId },
            }
          : false,
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const commentsWithLikes = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.fullName || comment.user.email?.split("@")[0] || "Unknown User",
        avatar: comment.user.avatarUrl,
      },
      liked: userId ? (comment.likes && comment.likes.length > 0) : false,
      likes_count: comment._count.likes,
    }));

    return NextResponse.json({ comments: commentsWithLikes });
  } catch (error) {
    console.error("Comments GET error", error);
    return NextResponse.json({ message: "Failed to fetch comments" }, { status: 500 });
  }
}

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
    const { content } = body;

    const comment = await prisma.postComment.create({
      data: {
        postId: id,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          name: comment.user.fullName || comment.user.email?.split("@")[0] || "Unknown User",
          avatar: comment.user.avatarUrl,
        },
        liked: false,
        likes_count: comment._count.likes,
      },
    });
  } catch (error) {
    console.error("Comment POST error", error);
    return NextResponse.json({ message: "Failed to create comment" }, { status: 500 });
  }
}
