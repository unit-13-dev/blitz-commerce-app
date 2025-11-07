import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: "published",
        rating: {
          not: null,
        },
        taggedItems: {
          some: {
            productId: id,
          },
        },
        tags: {
          some: {
            tag: {
              name: 'review',
            },
          },
        },
      },
      select: {
        rating: true,
      },
    });

    const ratings = posts.map((post) => post.rating).filter((rating): rating is number => rating !== null);
    const reviewCount = ratings.length;
    const averageRating = reviewCount > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount : 0;

    return NextResponse.json({ averageRating, reviewCount });
  } catch (error) {
    console.error("Product rating GET error", error);
    return NextResponse.json({ averageRating: 0, reviewCount: 0 }, { status: 500 });
  }
}

