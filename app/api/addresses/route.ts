import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const addresses = await prisma.userAddress.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDefault: "desc" }, // Default addresses first
        { createdAt: "desc" },
      ],
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
    const user = await requireAuth(request);
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

    // Validate required fields
    if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !postalCode) {
      return ApiResponseHandler.badRequest("Please fill all required fields");
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
      return ApiResponseHandler.badRequest("Please enter a valid 10-digit phone number");
    }

    // Validate postal code (basic validation for India)
    const postalCodeRegex = /^[0-9]{6}$/;
    if (!postalCodeRegex.test(postalCode)) {
      return ApiResponseHandler.badRequest("Please enter a valid 6-digit postal code");
    }

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
        addressType: addressType || "home",
        fullName,
        phoneNumber,
        addressLine1,
        addressLine2: addressLine2 || null,
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

