import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const drafts = await prisma.draft.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Drafts GET error", error);
    return NextResponse.json({ message: "Failed to fetch drafts" }, { status: 500 });
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
    const { content, privacy = "public", feeling } = body;

    const draft = await prisma.draft.create({
      data: {
        userId,
        content,
        privacy,
        feeling,
      },
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error("Draft POST error", error);
    return NextResponse.json({ message: "Failed to create draft" }, { status: 500 });
  }
}
