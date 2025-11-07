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
    const { accessCode } = body;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Check if private and access code is required
    if (group.isPrivate) {
      if (!accessCode || accessCode !== group.accessCode) {
        return NextResponse.json({ message: "Invalid access code" }, { status: 400 });
      }
    }

    // Check if already a member
    const isMember = group.members.some((m) => m.userId === userId);
    if (isMember) {
      return NextResponse.json({ message: "Already a member" }, { status: 400 });
    }

    // Check member limit
    if (group.memberLimit > 0 && group.members.length >= group.memberLimit) {
      return NextResponse.json({ message: "Group is full" }, { status: 400 });
    }

    await prisma.groupMember.create({
      data: {
        groupId: id,
        userId,
      },
    });

    return NextResponse.json({ message: "Joined group successfully" });
  } catch (error) {
    console.error("Group join error", error);
    return NextResponse.json({ message: "Failed to join group" }, { status: 500 });
  }
}

