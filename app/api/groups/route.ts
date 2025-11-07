import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function GET(request: Request) {
  // Allow public access to groups for listing
  // Only require auth for creating groups

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where: any = {};
    if (productId) {
      where.productId = productId;
    }

    const groups = await prisma.group.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        product: {
          include: {
            images: {
              orderBy: { displayOrder: "asc" },
              take: 1,
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Groups GET error", error);
    return NextResponse.json({ message: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, name, description, isPrivate, memberLimit, accessCode } = body;

    const group = await prisma.group.create({
      data: {
        creatorId: userId,
        productId,
        name,
        description,
        isPrivate: isPrivate || false,
        memberLimit: memberLimit || 0,
        accessCode: isPrivate ? accessCode : null,
        codeGeneratedAt: isPrivate ? new Date() : null,
        members: {
          create: {
            userId,
          },
        },
      },
      include: {
        creator: true,
        product: true,
        members: true,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Group POST error", error);
    return NextResponse.json({ message: "Failed to create group" }, { status: 500 });
  }
}

