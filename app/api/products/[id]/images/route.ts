import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const image = await prisma.productImage.findFirst({
      where: { productId: id },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ imageUrl: image?.imageUrl || null });
  } catch (error) {
    console.error("Product image GET error", error);
    return NextResponse.json({ imageUrl: null }, { status: 500 });
  }
}

