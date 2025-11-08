import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        bio: true,
        website: true,
        location: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return ApiResponseHandler.notFound("Profile not found");
    }

    return ApiResponseHandler.success({ profile }, "Profile fetched successfully");
  } catch (error: any) {
    console.error("Profile GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch profile", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const payload = await request.json();

    const targetUserId: string | null = payload.id ?? user?.id ?? null;

    if (!targetUserId) {
      return ApiResponseHandler.unauthorized();
    }

    if (user && user.id !== targetUserId) {
      if (user.role !== "admin") {
        return ApiResponseHandler.forbidden("You can only update your own profile");
      }
    }

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

    return ApiResponseHandler.created({ profile }, "Profile updated successfully");
  } catch (error: any) {
    console.error("Profile POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to update profile", 500, error);
  }
}

