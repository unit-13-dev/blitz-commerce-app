import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function POST(
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
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId,
      },
    });

    if (!member) {
      return NextResponse.json({ message: "Not a member" }, { status: 404 });
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    return NextResponse.json({ message: "Left group successfully" });
  } catch (error) {
    console.error("Group leave error", error);
    return NextResponse.json({ message: "Failed to leave group" }, { status: 500 });
  }
}

