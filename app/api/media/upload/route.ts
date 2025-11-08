import { getCloudinary } from "@/lib/cloudinary";
import { requireAuth } from "@/lib/auth-helpers";
import { ApiResponseHandler } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || `users/${user.id}`;

    if (!file) {
      return ApiResponseHandler.badRequest("File is required");
    }

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using server-side SDK
    const cloudinary = getCloudinary();
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return ApiResponseHandler.success(
      { url: uploadResult.secure_url },
      "File uploaded successfully"
    );
  } catch (error: any) {
    console.error("Media upload error", error);
    
    if (error.message?.includes('UNAUTHORIZED')) {
      return ApiResponseHandler.unauthorized();
    }
    
    return ApiResponseHandler.error("Failed to upload file", 500, error);
  }
}

