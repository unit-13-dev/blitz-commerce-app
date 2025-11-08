import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === 'admin' && currentUser?.id === id;
    
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            posts: {
              where: {
                status: 'published',
              },
            },
            followers: true,
            follows: true,
          },
        },
      },
    });

    if (!profile) {
      return ApiResponseHandler.notFound("Profile not found");
    }

    // If admin viewing their own profile, get application-wide stats
    let adminStats = null;
    if (isAdmin) {
      const [totalPosts, totalUsers, totalOrders, totalProducts, totalGroups] = await Promise.all([
        prisma.post.count({ where: { status: 'published' } }),
        prisma.profile.count(),
        prisma.order.count(),
        prisma.product.count(),
        prisma.group.count(),
      ]);

      adminStats = {
        totalPosts,
        totalUsers,
        totalOrders,
        totalProducts,
        totalGroups,
      };
    }

    // Add counts to profile object
    const profileWithCounts = {
      ...profile,
      posts_count: profile._count.posts,
      followers_count: profile._count.followers,
      following_count: profile._count.follows,
      adminStats,
    };

    // Remove _count from response
    const { _count, ...profileData } = profileWithCounts;

    return ApiResponseHandler.success({ profile: profileData }, "Profile fetched successfully");
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
    const user = await getCurrentUser();

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

