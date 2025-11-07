import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const payload = await request.json();

  const targetUserId: string | null = payload.id ?? userId ?? null;

  if (!targetUserId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (userId && userId !== targetUserId) {
    const actorRole = session?.user?.role;
    if (actorRole !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const profile = await prisma.profile.upsert({
      where: { id: targetUserId },
      create: {
        id: targetUserId,
        email: payload.email,
        fullName: payload.fullName ?? null,
        role: payload.role ?? "user",
        avatarUrl: payload.avatarUrl ?? null,
        bio: payload.bio ?? null,
        website: payload.website ?? null,
        location: payload.location ?? null,
      },
      update: {
        email: payload.email ?? undefined,
        fullName: payload.fullName ?? undefined,
        role: payload.role ?? undefined,
        avatarUrl: payload.avatarUrl ?? undefined,
        bio: payload.bio ?? undefined,
        website: payload.website ?? undefined,
        location: payload.location ?? undefined,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Profile create error", error);
    return NextResponse.json({ message: "Failed to create profile" }, { status: 500 });
  }
}

