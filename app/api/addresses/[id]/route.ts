import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

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
    const body = await request.json();
    const address = await prisma.userAddress.findUnique({
      where: { id },
    });

    if (!address || address.userId !== userId) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // If setting as default, unset others
    if (body.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.userAddress.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error("Address PUT error", error);
    return NextResponse.json({ message: "Failed to update address" }, { status: 500 });
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
    const address = await prisma.userAddress.findUnique({
      where: { id },
    });

    if (!address || address.userId !== userId) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    await prisma.userAddress.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Address deleted" });
  } catch (error) {
    console.error("Address DELETE error", error);
    return NextResponse.json({ message: "Failed to delete address" }, { status: 500 });
  }
}

