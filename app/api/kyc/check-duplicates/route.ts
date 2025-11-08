import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { gstNumber, panNumber, tanNumber, phoneNumber, existingKycId } = body;

    const errors: { [key: string]: string } = {};

    if (gstNumber) {
      const existing = await prisma.vendorKyc.findFirst({
        where: {
          gstNumber,
          isActive: true,
          vendorId: { not: user.id },
          ...(existingKycId ? { id: { not: existingKycId } } : {}),
        },
      });
      if (existing) {
        errors.gstNumber = 'GST number already exists with another vendor';
      }
    }

    if (panNumber) {
      const existing = await prisma.vendorKyc.findFirst({
        where: {
          panNumber,
          isActive: true,
          vendorId: { not: user.id },
          ...(existingKycId ? { id: { not: existingKycId } } : {}),
        },
      });
      if (existing) {
        errors.panNumber = 'PAN number already exists with another vendor';
      }
    }

    if (tanNumber) {
      const existing = await prisma.vendorKyc.findFirst({
        where: {
          tanNumber,
          isActive: true,
          vendorId: { not: user.id },
          ...(existingKycId ? { id: { not: existingKycId } } : {}),
        },
      });
      if (existing) {
        errors.tanNumber = 'TAN number already exists with another vendor';
      }
    }

    if (phoneNumber) {
      const existing = await prisma.vendorKyc.findFirst({
        where: {
          phoneNumber,
          isActive: true,
          vendorId: { not: user.id },
          ...(existingKycId ? { id: { not: existingKycId } } : {}),
        },
      });
      if (existing) {
        errors.phoneNumber = 'Phone number already exists with another vendor';
      }
    }

    return ApiResponseHandler.success({
      isValid: Object.keys(errors).length === 0,
      errors,
    }, "Duplicate check completed");
  } catch (error: any) {
    console.error("KYC duplicate check error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to check duplicates", 500, error);
  }
}
