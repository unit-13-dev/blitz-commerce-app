import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return ApiResponseHandler.unauthorized();
    }

    // Users can only view their own KYC, admins can view any
    const kyc = await prisma.vendorKyc.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!kyc) {
      return ApiResponseHandler.notFound("KYC not found");
    }

    const isAdmin = user.role === "admin";
    if (!isAdmin && kyc.vendorId !== user.id) {
      return ApiResponseHandler.forbidden("Access denied");
    }

    return ApiResponseHandler.success({ kyc }, "KYC fetched successfully");
  } catch (error: any) {
    console.error("KYC GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch KYC", 500, error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await requireRole(UserRole.admin);
    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return ApiResponseHandler.badRequest("Invalid status");
    }

    const kyc = await prisma.vendorKyc.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === "rejected" ? rejectionReason : null,
        reviewedAt: new Date(),
        reviewedBy: admin.id,
      },
      include: {
        vendor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return ApiResponseHandler.success({ kyc }, "KYC updated successfully");
  } catch (error: any) {
    console.error("KYC PUT error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    if (error.message?.includes('FORBIDDEN')) {
      return ApiResponseHandler.forbidden('Admin access required');
    }
    
    return ApiResponseHandler.error("Failed to update KYC", 500, error);
  }
}
