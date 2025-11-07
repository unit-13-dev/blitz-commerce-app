import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    
    const address = await prisma.userAddress.findUnique({
      where: { id },
    });

    if (!address || address.userId !== user.id) {
      return ApiResponseHandler.notFound("Address not found");
    }

    // If setting as default, unset others
    if (body.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.userAddress.update({
      where: { id },
      data: {
        addressType: body.addressType,
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country,
        isDefault: body.isDefault,
      },
    });

    return ApiResponseHandler.success({ address: updated }, "Address updated successfully");
  } catch (error: any) {
    console.error("Address PUT error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to update address", 500, error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const address = await prisma.userAddress.findUnique({
      where: { id },
    });

    if (!address || address.userId !== user.id) {
      return ApiResponseHandler.notFound("Address not found");
    }

    await prisma.userAddress.delete({
      where: { id },
    });

    return ApiResponseHandler.success({ message: "Address deleted" }, "Address deleted successfully");
  } catch (error: any) {
    console.error("Address DELETE error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to delete address", 500, error);
  }
}

