import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireAuth();

    const addresses = await prisma.userAddress.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return ApiResponseHandler.success({ addresses }, "Addresses fetched successfully");
  } catch (error: any) {
    console.error("Addresses GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch addresses", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      addressType,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = body;

    // If this is default, unset other defaults
    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.userAddress.create({
      data: {
        userId: user.id,
        addressType,
        fullName,
        phoneNumber,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country: country || "India",
        isDefault: isDefault || false,
      },
    });

    return ApiResponseHandler.created({ address }, "Address created successfully");
  } catch (error: any) {
    console.error("Address POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to create address", 500, error);
  }
}

