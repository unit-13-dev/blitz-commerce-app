import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: user.id,
      },
    });

    if (!member) {
      return ApiResponseHandler.notFound("You are not a member of this group");
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    return ApiResponseHandler.success({ message: "Left group successfully" }, "Left group successfully");
  } catch (error: any) {
    console.error("Group leave error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to leave group", 500, error);
  }
}

