import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-options";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const discountTiers = await prisma.productDiscountTier.findMany({
      where: { productId: id },
      orderBy: { tierNumber: "asc" },
    });

    return NextResponse.json({ discountTiers });
  } catch (error) {
    console.error("Discount tiers GET error", error);
    return NextResponse.json({ message: "Failed to fetch discount tiers" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    if (product.vendorId !== userId && role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { discountTiers } = body;

    // Delete existing tiers
    await prisma.productDiscountTier.deleteMany({
      where: { productId: id },
    });

    // Create new tiers
    if (discountTiers && discountTiers.length > 0) {
      await prisma.productDiscountTier.createMany({
        data: discountTiers.map((tier: any, index: number) => ({
          productId: id,
          tierNumber: index + 1,
          membersRequired: tier.membersRequired,
          discountPercentage: tier.discountPercentage,
        })),
      });

      // Enable group order on product
      await prisma.product.update({
        where: { id },
        data: { groupOrderEnabled: true },
      });
    } else {
      // Disable group order if no tiers
      await prisma.product.update({
        where: { id },
        data: { groupOrderEnabled: false },
      });
    }

    const updatedTiers = await prisma.productDiscountTier.findMany({
      where: { productId: id },
      orderBy: { tierNumber: "asc" },
    });

    return NextResponse.json({ discountTiers: updatedTiers });
  } catch (error) {
    console.error("Discount tiers PUT error", error);
    return NextResponse.json({ message: "Failed to update discount tiers" }, { status: 500 });
  }
}
