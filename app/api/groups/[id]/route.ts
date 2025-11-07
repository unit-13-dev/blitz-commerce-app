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
  
  // Allow public access for viewing groups
  try {
    const group = await prisma.group.findUnique({
      where: { id },
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
            },
            discountTiers: {
              orderBy: { tierNumber: "asc" },
            },
            vendor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
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
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Check if user is member or group is public
    const isMember = group.members.some((m) => m.userId === userId);
    if (group.isPrivate && !isMember && group.creatorId !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Group GET error", error);
    return NextResponse.json({ message: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PUT(
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
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group || group.creatorId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isPrivate, memberLimit } = body;

    const updated = await prisma.group.update({
      where: { id },
      data: {
        name,
        description,
        isPrivate,
        memberLimit,
      },
      include: {
        creator: true,
        product: true,
        members: true,
      },
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error("Group PUT error", error);
    return NextResponse.json({ message: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id },
    });

    const role = session?.user?.role;

    if (!group || (group.creatorId !== userId && role !== "admin")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.group.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Group deleted" });
  } catch (error) {
    console.error("Group DELETE error", error);
    return NextResponse.json({ message: "Failed to delete group" }, { status: 500 });
  }
}

