import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { apiClient } from "@/lib/api-client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getProductImageUrl(productId: string): Promise<string | null> {
  try {
    const { data } = await apiClient.get(`/products/${productId}/images`);
    return data?.imageUrl ?? null;
  } catch (error) {
    console.error("Error in getProductImageUrl:", error);
    return null;
  }
}

export async function getProductImages(productIds: string[]): Promise<Record<string, string | null>> {
  try {
    const { data } = await apiClient.get(`/products/images`, {
      params: { ids: productIds.join(',') },
    });
    return data?.images ?? {};
  } catch (error) {
    console.error("Error in getProductImages:", error);
    return {};
  }
}
