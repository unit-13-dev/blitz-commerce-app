import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireAuth();

    const kyc = await prisma.vendorKyc.findFirst({
      where: {
        vendorId: user.id,
        isActive: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return ApiResponseHandler.success({ kyc }, "KYC fetched successfully");
  } catch (error: any) {
    console.error("KYC GET error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to fetch KYC", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Get previous KYC to increment version
    const previousKyc = await prisma.vendorKyc.findFirst({
      where: {
        vendorId: user.id,
        isActive: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    const version = previousKyc ? previousKyc.version + 1 : 1;
    const submissionCount = previousKyc ? previousKyc.submissionCount + 1 : 1;

    // Deactivate previous KYC
    if (previousKyc) {
      await prisma.vendorKyc.update({
        where: { id: previousKyc.id },
        data: { isActive: false },
      });
    }

    const kyc = await prisma.vendorKyc.create({
      data: {
        vendorId: user.id,
        businessName: body.businessName,
        displayBusinessName: body.displayBusinessName,
        businessType: body.businessType,
        businessRegistrationNumber: body.businessRegistrationNumber,
        businessAddress: body.businessAddress,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        hoAddress: body.hoAddress,
        warehouseAddress: body.warehouseAddress,
        phoneNumber: body.phoneNumber,
        gstNumber: body.gstNumber,
        gstUrl: body.gstUrl,
        panNumber: body.panNumber,
        panUrl: body.panUrl,
        tanNumber: body.tanNumber,
        turnoverOver5cr: body.turnoverOver5cr || false,
        status: "pending",
        version,
        previousKycId: previousKyc?.id,
        submissionCount,
      },
    });

    return ApiResponseHandler.created({ kyc }, "KYC submitted successfully");
  } catch (error: any) {
    console.error("KYC POST error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to submit KYC", 500, error);
  }
}
