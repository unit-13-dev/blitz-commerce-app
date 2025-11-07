import { NextResponse } from "next/server";
import { createSignedUploadParams } from "@/lib/cloudinary";
import { getAuthSession } from "@/lib/auth-options";

export async function GET(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") ?? `users/${userId}`;

  try {
    const payload = createSignedUploadParams(folder);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Cloudinary signature error", error);
    return NextResponse.json({ message: "Failed to generate signature" }, { status: 500 });
  }
}

