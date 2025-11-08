import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request); // Optional auth for viewing groups
    const userId = user?.id ?? null;
    
    // Allow public access for viewing groups
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
      return ApiResponseHandler.notFound("Group not found");
    }

    // Check if user is member or group is public
    const isMember = userId ? group.members.some((m) => m.userId === userId) : false;
    if (group.isPrivate && !isMember && group.creatorId !== userId) {
      return ApiResponseHandler.forbidden("Access denied: This is a private group");
    }

    return ApiResponseHandler.success({ group }, "Group fetched successfully");
  } catch (error: any) {
    console.error("Group GET error", error);
    return ApiResponseHandler.error("Failed to fetch group", 500, error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(request);

    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      return ApiResponseHandler.notFound("Group not found");
    }

    if (group.creatorId !== user.id && user.role !== "admin") {
      return ApiResponseHandler.forbidden("Only the group creator can update this group");
    }

    const body = await request.json();
    const { name, description, isPrivate, memberLimit } = body;

    const updated = await prisma.group.update({
      where: { id },
      data: {
        name: name ?? undefined,
        description: description ?? undefined,
        isPrivate: isPrivate ?? undefined,
        memberLimit: memberLimit ?? undefined,
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

    return ApiResponseHandler.success({ group: updated }, "Group updated successfully");
  } catch (error: any) {
    console.error("Group PUT error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to update group", 500, error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth(request);

    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      return ApiResponseHandler.notFound("Group not found");
    }

    if (group.creatorId !== user.id && user.role !== "admin") {
      return ApiResponseHandler.forbidden("Only the group creator or admin can delete this group");
    }

    await prisma.group.delete({
      where: { id },
    });

    return ApiResponseHandler.success({ message: "Group deleted" }, "Group deleted successfully");
  } catch (error: any) {
    console.error("Group DELETE error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to delete group", 500, error);
  }
}

