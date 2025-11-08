import { createSignedUploadParams } from "@/lib/cloudinary";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") ?? `users/${user.id}`;

    const payload = createSignedUploadParams(folder);
    return ApiResponseHandler.success(payload, "Signature generated successfully");
  } catch (error: any) {
    console.error("Cloudinary signature error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to generate signature", 500, error);
  }
}

