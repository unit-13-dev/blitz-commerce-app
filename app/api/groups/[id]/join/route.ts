import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const { accessCode } = body;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!group) {
      return ApiResponseHandler.notFound("Group not found");
    }

    // Check if private and access code is required
    if (group.isPrivate) {
      if (!accessCode || accessCode !== group.accessCode) {
        return ApiResponseHandler.badRequest("Invalid access code");
      }
    }

    // Check if already a member
    const isMember = group.members.some((m) => m.userId === user.id);
    if (isMember) {
      return ApiResponseHandler.badRequest("Already a member of this group");
    }

    // Check member limit
    if (group.memberLimit > 0 && group.members.length >= group.memberLimit) {
      return ApiResponseHandler.badRequest("Group is full");
    }

    await prisma.groupMember.create({
      data: {
        groupId: id,
        userId: user.id,
      },
    });

    return ApiResponseHandler.success({ message: "Joined group successfully" }, "Joined group successfully");
  } catch (error: any) {
    console.error("Group join error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to join group", 500, error);
  }
}

