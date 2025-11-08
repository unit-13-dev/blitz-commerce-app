import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const drafts = await prisma.draft.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return ApiResponseHandler.success({ drafts }, "Drafts fetched successfully");
  } catch (error: any) {
    console.error("Drafts GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch drafts", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { content, privacy = "public", feeling } = body;

    if (!content || content.trim().length === 0) {
      return ApiResponseHandler.badRequest("Draft content is required");
    }

    const draft = await prisma.draft.create({
      data: {
        userId: user.id,
        content: content.trim(),
        privacy,
        feeling,
      },
    });

    return ApiResponseHandler.created({ draft }, "Draft created successfully");
  } catch (error: any) {
    console.error("Draft POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to create draft", 500, error);
  }
}
