import { prisma } from "@/lib/prisma";
import { ApiResponseHandler } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all"; // all, users, products

    const searchTerm = q.trim().toLowerCase();

    if (!searchTerm) {
      return ApiResponseHandler.success({ users: [], products: [] }, "Search completed");
    }

    const results: { users: any[]; products: any[] } = {
      users: [],
      products: [],
    };

    if (type === "all" || type === "users") {
      const users = await prisma.profile.findMany({
        where: {
          OR: [
            { fullName: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
        take: 20,
      });

      results.users = users.map((user) => ({
        id: user.id,
        name: user.fullName || user.email?.split("@")[0] || `User_${user.id.slice(0, 8)}`,
        username: `@${user.email?.split("@")[0] || user.id.slice(0, 8)}`,
        type: "user" as const,
        avatarUrl: user.avatarUrl,
      }));
    }

    if (type === "all" || type === "products") {
      const products = await prisma.product.findMany({
        where: {
          name: { contains: searchTerm, mode: "insensitive" },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          vendorId: true,
          images: {
            orderBy: { displayOrder: "asc" },
            take: 1,
          },
        },
        take: 20,
      });

      results.products = products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.images[0]?.imageUrl || product.imageUrl,
        vendor_id: product.vendorId,
        type: "product" as const,
      }));
    }

    return ApiResponseHandler.success(results, "Search completed successfully");
  } catch (error: any) {
    console.error("Search GET error", error);
    return ApiResponseHandler.error("Failed to search", 500, error);
  }
}