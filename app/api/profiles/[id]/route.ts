import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      return ApiResponseHandler.notFound("Profile not found");
    }

    return ApiResponseHandler.success({ profile }, "Profile fetched successfully");
  } catch (error: any) {
    console.error("Profile GET error", error);
    return ApiResponseHandler.error("Failed to load profile", 500, error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return ApiResponseHandler.unauthorized();
    }

    // Only allow users to update their own profile, or admins to update any profile
    if (user.id !== id && user.role !== "admin") {
      return ApiResponseHandler.forbidden("You can only update your own profile");
    }

    const payload = await request.json();

    // Only admins can change roles
    if (payload.role && user.role !== "admin" && payload.role !== user.role) {
      return ApiResponseHandler.forbidden("Only admins can change user roles");
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        email: payload.email ?? undefined,
        fullName: payload.fullName ?? undefined,
        role: user.role === "admin" ? payload.role ?? undefined : undefined,
        avatarUrl: payload.avatarUrl ?? undefined,
        bio: payload.bio ?? undefined,
        website: payload.website ?? undefined,
        location: payload.location ?? undefined,
      },
    });

    return ApiResponseHandler.success({ profile }, "Profile updated successfully");
  } catch (error: any) {
    console.error("Profile update error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden();
    }
    
    return ApiResponseHandler.error("Failed to update profile", 500, error);
  }
}

