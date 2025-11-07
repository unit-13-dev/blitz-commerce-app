import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function DELETE() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ message: "Cart cleared" });
  } catch (error) {
    console.error("Cart clear error", error);
    return NextResponse.json({ message: "Failed to clear cart" }, { status: 500 });
  }
}

