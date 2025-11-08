import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

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

    return ApiResponseHandler.success({ groups }, "Groups fetched successfully");
  } catch (error: any) {
    console.error("Groups GET error", error);
    return ApiResponseHandler.error("Failed to fetch groups", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { productId, name, description, isPrivate, memberLimit, accessCode } = body;

    if (!productId || !name) {
      return ApiResponseHandler.badRequest("Product ID and name are required");
    }

    const group = await prisma.group.create({
      data: {
        creatorId: user.id,
        productId,
        name,
        description,
        isPrivate: isPrivate || false,
        memberLimit: memberLimit || 0,
        accessCode: isPrivate ? accessCode : null,
        codeGeneratedAt: isPrivate ? new Date() : null,
        members: {
          create: {
            userId: user.id,
          },
        },
      },
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
      },
    });

    return ApiResponseHandler.created({ group }, "Group created successfully");
  } catch (error: any) {
    console.error("Group POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to create group", 500, error);
  }
}

